from rest_framework import serializers
from .models import Truck, Location, DeliveryRoute, RouteRequest, RouteBid
from authentication.serializers import UserSerializer

class TruckSerializer(serializers.ModelSerializer):
    driver_details = UserSerializer(source='driver', read_only=True)

    class Meta:
        model = Truck
        fields = ('id', 'truck_number', 'license_plate', 'model', 'truck_type', 'capacity_tons', 'driver', 'driver_details', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class LocationSerializer(serializers.ModelSerializer):
    truck_details = TruckSerializer(source='truck', read_only=True)
    driver_details = UserSerializer(source='driver', read_only=True)

    class Meta:
        model = Location
        fields = ('id', 'truck', 'truck_details', 'driver', 'driver_details', 'latitude', 'longitude', 'speed', 'heading', 'accuracy', 'timestamp')
        read_only_fields = ('id', 'timestamp')

class LocationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ('truck', 'latitude', 'longitude', 'speed', 'heading', 'accuracy')

    def create(self, validated_data):
        # Set the driver from the request user
        validated_data['driver'] = self.context['request'].user
        return super().create(validated_data)

class RouteRequestSerializer(serializers.ModelSerializer):
    created_by_details = UserSerializer(source='created_by', read_only=True)
    assigned_driver_details = UserSerializer(source='assigned_driver', read_only=True)
    assigned_truck_details = TruckSerializer(source='assigned_truck', read_only=True)
    bid_count = serializers.SerializerMethodField()
    lowest_bid = serializers.SerializerMethodField()

    class Meta:
        model = RouteRequest
        fields = (
            'id', 'title', 'description', 'start_location', 'end_location',
            'start_latitude', 'start_longitude', 'end_latitude', 'end_longitude',
            'material_type', 'required_truck_type', 'estimated_weight_tons', 'distance_km',
            'budget_min', 'budget_max', 'pickup_deadline', 'delivery_deadline',
            'status', 'created_by', 'created_by_details', 'assigned_driver', 'assigned_driver_details',
            'assigned_truck', 'assigned_truck_details', 'winning_bid_amount',
            'bid_count', 'lowest_bid', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_by', 'bid_count', 'lowest_bid', 'created_at', 'updated_at')

    def get_bid_count(self, obj):
        return obj.bids.count()

    def get_lowest_bid(self, obj):
        lowest_bid = obj.bids.filter(status='pending').order_by('bid_amount').first()
        return lowest_bid.bid_amount if lowest_bid else None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class RouteBidSerializer(serializers.ModelSerializer):
    driver_details = UserSerializer(source='driver', read_only=True)
    truck_details = TruckSerializer(source='truck', read_only=True)
    route_request_details = RouteRequestSerializer(source='route_request', read_only=True)

    class Meta:
        model = RouteBid
        fields = (
            'id', 'route_request', 'route_request_details', 'driver', 'driver_details',
            'truck', 'truck_details', 'bid_amount', 'estimated_pickup_time',
            'estimated_delivery_time', 'additional_notes', 'status',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'driver', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['driver'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, data):
        # Ensure the truck belongs to the driver
        user = self.context['request'].user
        if data['truck'].driver != user:
            raise serializers.ValidationError("You can only bid with your assigned truck.")
        
        # Ensure route is open for bidding
        if data['route_request'].status != 'open':
            raise serializers.ValidationError("This route is not open for bidding.")
        
        # Check truck type compatibility
        route_request = data['route_request']
        truck = data['truck']
        if route_request.required_truck_type != 'any' and truck.truck_type != route_request.required_truck_type:
            raise serializers.ValidationError(f"This route requires a {route_request.get_required_truck_type_display().lower()}.")
        
        return data

class DeliveryRouteSerializer(serializers.ModelSerializer):
    truck_details = TruckSerializer(source='truck', read_only=True)
    driver_details = UserSerializer(source='driver', read_only=True)
    route_request_details = RouteRequestSerializer(source='route_request', read_only=True)
    bid_details = RouteBidSerializer(source='accepted_bid', read_only=True)

    class Meta:
        model = DeliveryRoute
        fields = (
            'id', 'route_request', 'route_request_details', 'accepted_bid', 'bid_details',
            'truck', 'truck_details', 'driver', 'driver_details',
            'start_location', 'end_location', 'start_latitude', 'start_longitude',
            'end_latitude', 'end_longitude', 'status', 'started_at', 'completed_at',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class TruckLocationHistorySerializer(serializers.Serializer):
    truck_id = serializers.IntegerField()
    locations = LocationSerializer(many=True, read_only=True)

class LiveTrackingSerializer(serializers.Serializer):
    truck_id = serializers.IntegerField()
    latest_location = LocationSerializer(read_only=True)
    route_history = LocationSerializer(many=True, read_only=True)
