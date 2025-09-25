from django.contrib import admin
from .models import Truck, Location, DeliveryRoute, RouteRequest, RouteBid

@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = ('truck_number', 'license_plate', 'model', 'truck_type', 'capacity_tons', 'driver', 'status', 'created_at')
    list_filter = ('status', 'truck_type', 'created_at')
    search_fields = ('truck_number', 'license_plate', 'model')
    ordering = ('-created_at',)

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('truck', 'driver', 'latitude', 'longitude', 'speed', 'timestamp')
    list_filter = ('truck', 'timestamp')
    search_fields = ('truck__truck_number', 'driver__username')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp',)

@admin.register(RouteRequest)
class RouteRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'start_location', 'end_location', 'material_type', 'required_truck_type', 'budget_min', 'budget_max', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'material_type', 'required_truck_type', 'created_at')
    search_fields = ('title', 'start_location', 'end_location', 'created_by__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(RouteBid)
class RouteBidAdmin(admin.ModelAdmin):
    list_display = ('route_request', 'driver', 'truck', 'bid_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('route_request__title', 'driver__username', 'truck__truck_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DeliveryRoute)
class DeliveryRouteAdmin(admin.ModelAdmin):
    list_display = ('truck', 'driver', 'start_location', 'end_location', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('truck__truck_number', 'driver__username', 'start_location', 'end_location')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
