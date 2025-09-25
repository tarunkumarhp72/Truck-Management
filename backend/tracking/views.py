from rest_framework import status, generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .models import Truck, Location, DeliveryRoute
from .serializers import (
    TruckSerializer, LocationSerializer, LocationCreateSerializer,
    DeliveryRouteSerializer, TruckLocationHistorySerializer
)

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.role == 'admin'

class TruckListCreateView(generics.ListCreateAPIView):
    serializer_class = TruckSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Truck.objects.all()
        elif self.request.user.role == 'driver':
            return Truck.objects.filter(driver=self.request.user)
        return Truck.objects.none()

class TruckDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TruckSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Truck.objects.all()
        elif self.request.user.role == 'driver':
            return Truck.objects.filter(driver=self.request.user)
        return Truck.objects.none()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def assign_driver_to_truck(request, truck_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can assign drivers'}, status=status.HTTP_403_FORBIDDEN)
    
    truck = get_object_or_404(Truck, id=truck_id)
    driver_id = request.data.get('driver_id')
    
    if driver_id:
        from authentication.models import CustomUser
        driver = get_object_or_404(CustomUser, id=driver_id, role='driver')
        truck.driver = driver
        truck.save()
        return Response(TruckSerializer(truck).data)
    else:
        truck.driver = None
        truck.save()
        return Response(TruckSerializer(truck).data)

class LocationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LocationCreateSerializer
        return LocationSerializer

    def get_queryset(self):
        truck_id = self.request.query_params.get('truck_id')
        if truck_id:
            return Location.objects.filter(truck_id=truck_id)
        
        if self.request.user.role == 'admin':
            return Location.objects.all()
        elif self.request.user.role == 'driver':
            return Location.objects.filter(driver=self.request.user)
        return Location.objects.none()

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def truck_live_location(request, truck_id):
    truck = get_object_or_404(Truck, id=truck_id)
    
    # Check permissions
    if request.user.role == 'driver' and truck.driver != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    latest_location = Location.objects.filter(truck=truck).first()
    if latest_location:
        return Response(LocationSerializer(latest_location).data)
    return Response({'message': 'No location data available'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def truck_location_history(request, truck_id):
    truck = get_object_or_404(Truck, id=truck_id)
    
    # Check permissions
    if request.user.role == 'driver' and truck.driver != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    limit = int(request.query_params.get('limit', 20))
    locations = Location.objects.filter(truck=truck)[:limit]
    
    return Response({
        'truck_id': truck_id,
        'locations': LocationSerializer(locations, many=True).data
    })

class DeliveryRouteListCreateView(generics.ListCreateAPIView):
    serializer_class = DeliveryRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return DeliveryRoute.objects.all()
        elif self.request.user.role == 'driver':
            return DeliveryRoute.objects.filter(driver=self.request.user)
        return DeliveryRoute.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'driver':
            # Driver can only create routes for their assigned truck
            try:
                truck = Truck.objects.get(driver=self.request.user)
                serializer.save(driver=self.request.user, truck=truck)
            except Truck.DoesNotExist:
                raise serializers.ValidationError("No truck assigned to this driver")
        else:
            serializer.save()

class DeliveryRouteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeliveryRouteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return DeliveryRoute.objects.all()
        elif self.request.user.role == 'driver':
            return DeliveryRoute.objects.filter(driver=self.request.user)
        return DeliveryRoute.objects.none()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def start_route(request, route_id):
    route = get_object_or_404(DeliveryRoute, id=route_id)
    
    # Check permissions
    if request.user.role == 'driver' and route.driver != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if route.status == 'pending':
        route.status = 'in_progress'
        route.started_at = timezone.now()
        route.save()
        return Response(DeliveryRouteSerializer(route).data)
    
    return Response({'error': 'Route cannot be started'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def complete_route(request, route_id):
    route = get_object_or_404(DeliveryRoute, id=route_id)
    
    # Check permissions
    if request.user.role == 'driver' and route.driver != request.user:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if route.status == 'in_progress':
        route.status = 'completed'
        route.completed_at = timezone.now()
        route.save()
        return Response(DeliveryRouteSerializer(route).data)
    
    return Response({'error': 'Route cannot be completed'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_data(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    trucks = Truck.objects.all()
    active_routes = DeliveryRoute.objects.filter(status='in_progress')
    
    dashboard_data = {
        'total_trucks': trucks.count(),
        'active_trucks': trucks.filter(status='active').count(),
        'active_routes': active_routes.count(),
        'trucks': TruckSerializer(trucks, many=True).data,
        'active_routes_data': DeliveryRouteSerializer(active_routes, many=True).data
    }
    
    return Response(dashboard_data)
