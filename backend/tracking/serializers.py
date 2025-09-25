from rest_framework import serializers
from .models import Truck, Location, DeliveryRoute
from authentication.serializers import UserSerializer

class TruckSerializer(serializers.ModelSerializer):
    driver_details = UserSerializer(source='driver', read_only=True)

    class Meta:
        model = Truck
        fields = ('id', 'truck_number', 'license_plate', 'model', 'driver', 'driver_details', 'status', 'created_at', 'updated_at')
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

class DeliveryRouteSerializer(serializers.ModelSerializer):
    truck_details = TruckSerializer(source='truck', read_only=True)
    driver_details = UserSerializer(source='driver', read_only=True)

    class Meta:
        model = DeliveryRoute
        fields = (
            'id', 'truck', 'truck_details', 'driver', 'driver_details',
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
