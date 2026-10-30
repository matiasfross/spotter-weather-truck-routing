from django.urls import path
from routing.views import (
    CalculateRoutesAPIView,
    GeocodeSearchAPIView,
    PresetRoutesAPIView,
    RadarTileProxyAPIView,
)

urlpatterns = [
    path('calculate/', CalculateRoutesAPIView.as_view(), name='calculate-routes'),
    path('geocode/', GeocodeSearchAPIView.as_view(), name='geocode-search'),
    path('presets/', PresetRoutesAPIView.as_view(), name='preset-routes'),
    path('radar-tile/<str:layer>/<int:z>/<int:x>/<int:y>.png', RadarTileProxyAPIView.as_view(), name='radar-tile-proxy'),
]
