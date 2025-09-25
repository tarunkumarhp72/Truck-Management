from rest_framework import status, generics, permissions, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .models import Truck, Location, DeliveryRoute, RouteRequest, RouteBid
from .serializers import (
    TruckSerializer, LocationSerializer, LocationCreateSerializer,
    DeliveryRouteSerializer, TruckLocationHistorySerializer,
    RouteRequestSerializer, RouteBidSerializer
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

# Route Request Views (Bidding System)
class RouteRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = RouteRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return RouteRequest.objects.all()
        elif self.request.user.role == 'driver':
            # Drivers can see open routes and their assigned routes
            return RouteRequest.objects.filter(
                Q(status='open') | Q(assigned_driver=self.request.user)
            )
        return RouteRequest.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            raise serializers.ValidationError("Only admins can create route requests")
        serializer.save()

class RouteRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RouteRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return RouteRequest.objects.all()
        elif self.request.user.role == 'driver':
            return RouteRequest.objects.filter(
                Q(status='open') | Q(assigned_driver=self.request.user)
            )
        return RouteRequest.objects.none()

# Route Bid Views
class RouteBidListCreateView(generics.ListCreateAPIView):
    serializer_class = RouteBidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        route_request_id = self.request.query_params.get('route_request_id')
        
        if self.request.user.role == 'admin':
            queryset = RouteBid.objects.all()
            if route_request_id:
                queryset = queryset.filter(route_request_id=route_request_id)
            return queryset
        elif self.request.user.role == 'driver':
            # Drivers can see their own bids
            queryset = RouteBid.objects.filter(driver=self.request.user)
            if route_request_id:
                queryset = queryset.filter(route_request_id=route_request_id)
            return queryset
        return RouteBid.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'driver':
            raise serializers.ValidationError("Only drivers can place bids")
        serializer.save()

class RouteBidDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RouteBidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return RouteBid.objects.all()
        elif self.request.user.role == 'driver':
            return RouteBid.objects.filter(driver=self.request.user)
        return RouteBid.objects.none()

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def accept_bid(request, bid_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can accept bids'}, status=status.HTTP_403_FORBIDDEN)
    
    bid = get_object_or_404(RouteBid, id=bid_id)
    route_request = bid.route_request
    
    if route_request.status != 'open':
        return Response({'error': 'Route request is not open for bidding'}, status=status.HTTP_400_BAD_REQUEST)
    
    if bid.status != 'pending':
        return Response({'error': 'Bid is not pending'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Accept the bid
    bid.status = 'accepted'
    bid.save()
    
    # Update route request
    route_request.status = 'assigned'
    route_request.assigned_driver = bid.driver
    route_request.assigned_truck = bid.truck
    route_request.winning_bid_amount = bid.bid_amount
    route_request.save()
    
    # Reject all other bids for this route
    RouteBid.objects.filter(route_request=route_request).exclude(id=bid_id).update(status='rejected')
    
    # Create delivery route
    delivery_route = DeliveryRoute.objects.create(
        route_request=route_request,
        accepted_bid=bid,
        truck=bid.truck,
        driver=bid.driver,
        start_location=route_request.start_location,
        end_location=route_request.end_location,
        start_latitude=route_request.start_latitude,
        start_longitude=route_request.start_longitude,
        end_latitude=route_request.end_latitude,
        end_longitude=route_request.end_longitude,
    )
    
    return Response({
        'bid': RouteBidSerializer(bid).data,
        'route_request': RouteRequestSerializer(route_request).data,
        'delivery_route': DeliveryRouteSerializer(delivery_route).data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reject_bid(request, bid_id):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can reject bids'}, status=status.HTTP_403_FORBIDDEN)
    
    bid = get_object_or_404(RouteBid, id=bid_id)
    
    if bid.status != 'pending':
        return Response({'error': 'Bid is not pending'}, status=status.HTTP_400_BAD_REQUEST)
    
    bid.status = 'rejected'
    bid.save()
    
    return Response(RouteBidSerializer(bid).data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def withdraw_bid(request, bid_id):
    bid = get_object_or_404(RouteBid, id=bid_id, driver=request.user)
    
    if bid.status != 'pending':
        return Response({'error': 'Only pending bids can be withdrawn'}, status=status.HTTP_400_BAD_REQUEST)
    
    bid.status = 'withdrawn'
    bid.save()
    
    return Response(RouteBidSerializer(bid).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def route_bids(request, route_request_id):
    """Get all bids for a specific route request"""
    route_request = get_object_or_404(RouteRequest, id=route_request_id)
    
    if request.user.role == 'driver':
        # Drivers can only see their own bids
        bids = RouteBid.objects.filter(route_request=route_request, driver=request.user)
    else:
        # Admins can see all bids
        bids = RouteBid.objects.filter(route_request=route_request)
    
    return Response(RouteBidSerializer(bids, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def available_routes(request):
    """Get available routes for drivers to bid on"""
    if request.user.role != 'driver':
        return Response({'error': 'Driver access required'}, status=status.HTTP_403_FORBIDDEN)
    
    # Get driver's truck
    try:
        truck = Truck.objects.get(driver=request.user)
    except Truck.DoesNotExist:
        return Response({'error': 'No truck assigned to this driver'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get open routes that match truck type or accept any type
    routes = RouteRequest.objects.filter(
        status='open'
    ).filter(
        Q(required_truck_type='any') | Q(required_truck_type=truck.truck_type)
    )
    
    # Exclude routes where driver already placed a bid
    existing_bid_routes = RouteBid.objects.filter(driver=request.user).values_list('route_request_id', flat=True)
    routes = routes.exclude(id__in=existing_bid_routes)
    
    return Response(RouteRequestSerializer(routes, many=True).data)
