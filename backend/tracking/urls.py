from django.urls import path
from . import views

urlpatterns = [
    # Truck management
    path('trucks/', views.TruckListCreateView.as_view(), name='truck_list_create'),
    path('trucks/<int:pk>/', views.TruckDetailView.as_view(), name='truck_detail'),
    path('trucks/<int:truck_id>/assign-driver/', views.assign_driver_to_truck, name='assign_driver'),
    
    # Location tracking
    path('locations/', views.LocationListCreateView.as_view(), name='location_list_create'),
    path('trucks/<int:truck_id>/live-location/', views.truck_live_location, name='truck_live_location'),
    path('trucks/<int:truck_id>/location-history/', views.truck_location_history, name='truck_location_history'),
    
    # Delivery routes
    path('routes/', views.DeliveryRouteListCreateView.as_view(), name='route_list_create'),
    path('routes/<int:pk>/', views.DeliveryRouteDetailView.as_view(), name='route_detail'),
    path('routes/<int:route_id>/start/', views.start_route, name='start_route'),
    path('routes/<int:route_id>/complete/', views.complete_route, name='complete_route'),
    
    # Dashboard
    path('dashboard/', views.dashboard_data, name='dashboard_data'),
]
