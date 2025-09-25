from django.contrib import admin
from .models import Truck, Location, DeliveryRoute

@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = ('truck_number', 'license_plate', 'model', 'driver', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('truck_number', 'license_plate', 'model')
    ordering = ('-created_at',)

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('truck', 'driver', 'latitude', 'longitude', 'speed', 'timestamp')
    list_filter = ('truck', 'timestamp')
    search_fields = ('truck__truck_number', 'driver__username')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp',)

@admin.register(DeliveryRoute)
class DeliveryRouteAdmin(admin.ModelAdmin):
    list_display = ('truck', 'driver', 'start_location', 'end_location', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('truck__truck_number', 'driver__username', 'start_location', 'end_location')
    ordering = ('-created_at',)
