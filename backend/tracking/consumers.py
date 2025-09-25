import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.conf import settings
import jwt
from .models import Truck, Location
from .serializers import LocationSerializer

User = get_user_model()

class LocationTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.truck_id = self.scope['url_route']['kwargs']['truck_id']
        self.truck_group_name = f'truck_{self.truck_id}'
        
        # Get token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break
        
        if not token:
            await self.close(code=4001)
            return
        
        # Authenticate user with token
        try:
            user = await self.get_user_from_token(token)
            if not user:
                await self.close(code=4002)
                return
            self.user = user
        except Exception:
            await self.close(code=4003)
            return
        
        # Check permissions
        if not await self.has_permission():
            await self.close(code=4004)
            return

        # Join truck group
        await self.channel_layer.group_add(
            self.truck_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave truck group
        await self.channel_layer.group_discard(
            self.truck_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'location_update':
            # Handle location update from driver
            if self.user.role == 'driver':
                await self.handle_location_update(text_data_json)

    async def handle_location_update(self, data):
        try:
            # Save location to database
            location = await self.save_location(data)
            
            # Broadcast to truck group
            await self.channel_layer.group_send(
                self.truck_group_name,
                {
                    'type': 'location_broadcast',
                    'location': location
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': str(e)
            }))

    async def location_broadcast(self, event):
        location = event['location']

        # Send location to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'location': location
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            # Decode JWT token
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = decoded.get('user_id')
            if user_id:
                return User.objects.get(id=user_id)
            return None
        except (jwt.DecodeError, jwt.ExpiredSignatureError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def has_permission(self):
        try:
            truck = Truck.objects.get(id=self.truck_id)
            if self.user.role == 'admin':
                return True
            elif self.user.role == 'driver' and truck.driver == self.user:
                return True
            return False
        except Truck.DoesNotExist:
            return False

    @database_sync_to_async
    def save_location(self, data):
        try:
            truck = Truck.objects.get(id=self.truck_id)
            location = Location.objects.create(
                truck=truck,
                driver=self.user,
                latitude=data['latitude'],
                longitude=data['longitude'],
                speed=data.get('speed', 0.0),
                heading=data.get('heading', 0.0),
                accuracy=data.get('accuracy', 0.0)
            )
            return LocationSerializer(location).data
        except Exception as e:
            raise Exception(f"Error saving location: {str(e)}")

class AdminDashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get token from query string
        query_string = self.scope.get('query_string', b'').decode()
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=', 1)[1]
                break
        
        if not token:
            await self.close(code=4001)
            return
        
        # Authenticate user with token
        try:
            user = await self.get_user_from_token(token)
            if not user or user.role != 'admin':
                await self.close(code=4002)
                return
            self.user = user
        except Exception:
            await self.close(code=4003)
            return

        # Join admin group
        await self.channel_layer.group_add(
            'admin_dashboard',
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave admin group
        await self.channel_layer.group_discard(
            'admin_dashboard',
            self.channel_name
        )

    async def receive(self, text_data):
        # Handle any admin-specific messages
        pass

    async def truck_status_update(self, event):
        # Send truck status updates to admin
        await self.send(text_data=json.dumps({
            'type': 'truck_status_update',
            'data': event['data']
        }))

    async def location_update_admin(self, event):
        # Send location updates to admin dashboard
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            # Decode JWT token
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = decoded.get('user_id')
            if user_id:
                return User.objects.get(id=user_id)
            return None
        except (jwt.DecodeError, jwt.ExpiredSignatureError, User.DoesNotExist):
            return None
