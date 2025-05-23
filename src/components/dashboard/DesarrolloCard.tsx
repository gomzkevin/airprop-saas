
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tables } from '@/integrations/supabase/types';
import { 
  Home, 
  Bath, 
  Dumbbell, 
  Flame, 
  ParkingSquare, 
  Utensils, 
  Wifi, 
  Baby, 
  Lock, 
  Car, 
  Trees, 
  Waves, 
  Coffee, 
  GlassWater, 
  Check,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { countDesarrolloUnidadesByStatus } from '@/hooks/unidades/countUtils';

type Desarrollo = Tables<"desarrollos">;

type DesarrolloCardProps = {
  desarrollo: Desarrollo;
  onViewDetails: (id: string) => void;
};

const DesarrolloCard = ({ desarrollo, onViewDetails }: DesarrolloCardProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [prototiposCount, setPrototiposCount] = useState<number>(0);
  const [amenidades, setAmenidades] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unidadesStats, setUnidadesStats] = useState({
    disponibles: 0,
    vendidas: 0,
    con_anticipo: 0,
    total: 0
  });
  const [hasVendidoUnits, setHasVendidoUnits] = useState(false);
  
  useEffect(() => {
    const fetchCardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch main image
        await fetchMainImage();
        
        // Fetch prototipos count
        await fetchPrototiposCount();
        
        // Parse amenidades
        parseAmenidades();
        
        // Get actual unit counts from countDesarrolloUnidadesByStatus
        const unitStats = await countDesarrolloUnidadesByStatus(desarrollo.id);
        setUnidadesStats(unitStats);
        
        // Check if there are any units with status "vendido"
        await checkForVendidoUnits();
      } catch (error) {
        console.error('Error loading desarrollo card data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCardData();
  }, [desarrollo.id]);

  const checkForVendidoUnits = async () => {
    try {
      // Get all prototipos for this desarrollo
      const { data: prototipos, error: prototiposError } = await supabase
        .from('prototipos')
        .select('id')
        .eq('desarrollo_id', desarrollo.id);
      
      if (prototiposError || !prototipos || prototipos.length === 0) {
        setHasVendidoUnits(false);
        return;
      }
      
      const prototipoIds = prototipos.map(p => p.id);
      
      // Check if there's at least one unit with estado = 'vendido'
      const { count, error } = await supabase
        .from('unidades')
        .select('id', { count: 'exact', head: true })
        .in('prototipo_id', prototipoIds)
        .eq('estado', 'vendido');
      
      if (error) {
        console.error('Error checking for vendido units:', error);
        setHasVendidoUnits(false);
      } else {
        setHasVendidoUnits(count !== null && count > 0);
      }
    } catch (error) {
      console.error('Error checking for vendido units:', error);
      setHasVendidoUnits(false);
    }
  };
  
  const fetchMainImage = async () => {
    try {
      // Try to get the main image first
      const { data: mainImageData, error: mainImageError } = await supabase
        .from('desarrollo_imagenes')
        .select('url')
        .eq('desarrollo_id', desarrollo.id)
        .eq('es_principal', true)
        .maybeSingle();
      
      if (!mainImageError && mainImageData) {
        setMainImage(mainImageData.url);
        return;
      }
      
      // If there's no main image, get any image
      if (!mainImageError) {
        const { data: anyImageData, error: anyImageError } = await supabase
          .from('desarrollo_imagenes')
          .select('url')
          .eq('desarrollo_id', desarrollo.id)
          .order('orden', { ascending: true })
          .limit(1)
          .maybeSingle();
          
        if (!anyImageError && anyImageData) {
          setMainImage(anyImageData.url);
          return;
        }
      }
      
      // Fallback to the imagen_url if it exists
      setMainImage(desarrollo.imagen_url);
    } catch (error) {
      console.error('Error fetching desarrollo image:', error);
    }
  };
  
  const fetchPrototiposCount = async () => {
    try {
      const { count, error } = await supabase
        .from('prototipos')
        .select('*', { count: 'exact', head: true })
        .eq('desarrollo_id', desarrollo.id);
      
      if (!error && count !== null) {
        setPrototiposCount(count);
      }
    } catch (error) {
      console.error('Error fetching prototipos count:', error);
    }
  };
  
  const parseAmenidades = () => {
    if (!desarrollo.amenidades) {
      setAmenidades([]);
      return;
    }
    
    try {
      let amenidadesList: string[] = [];
      
      if (Array.isArray(desarrollo.amenidades)) {
        amenidadesList = desarrollo.amenidades.map(item => String(item));
      } else if (typeof desarrollo.amenidades === 'string') {
        try {
          const parsed = JSON.parse(desarrollo.amenidades);
          if (Array.isArray(parsed)) {
            amenidadesList = parsed.map(item => String(item));
          }
        } catch (e) {
          amenidadesList = [desarrollo.amenidades];
        }
      } else if (typeof desarrollo.amenidades === 'object' && desarrollo.amenidades !== null) {
        amenidadesList = Object.values(desarrollo.amenidades).map(val => String(val));
      }
      
      setAmenidades(amenidadesList);
    } catch (error) {
      console.error('Error parsing amenidades:', error);
      setAmenidades([]);
    }
  };
  
  const getDesarrolloStatus = (desarrollo: Desarrollo) => {
    // Calculate status based on whether there are any sold units (vendido status)
    if (hasVendidoUnits) {
      return { label: 'En venta', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      // If no units have been fully sold, but there might be units with deposits
      if (unidadesStats.con_anticipo > 0) {
        return { label: 'Pre-venta', color: 'bg-blue-100 text-blue-800' };
      } else if (unidadesStats.disponibles === 0 && unidadesStats.total > 0) {
        // If there are no available units, consider it sold out
        return { label: 'Vendido', color: 'bg-green-100 text-green-800' };
      } else {
        // Default status for developments with only available units
        return { label: 'Pre-venta', color: 'bg-blue-100 text-blue-800' };
      }
    }
  };
  
  const getUnitCountDisplay = () => {
    // Use the actual unit stats from the database for available/total count
    const available = unidadesStats.disponibles;
    const total = unidadesStats.total || desarrollo.total_unidades || 0;
    
    return `${available}/${total}`;
  };
  
  const status = getDesarrolloStatus(desarrollo);
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => onViewDetails(desarrollo.id)}
    >
      <div className="relative h-48 bg-slate-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-slate-100 animate-pulse">
            <span className="text-slate-400">Cargando...</span>
          </div>
        ) : mainImage ? (
          <img 
            src={mainImage} 
            alt={desarrollo.nombre} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            No hay imagen disponible
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-5">
        <h3 className="text-xl font-bold mb-2">{desarrollo.nombre}</h3>
        <p className="text-slate-600 mb-3">{desarrollo.ubicacion}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {!isLoading && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {prototiposCount} {prototiposCount === 1 ? 'prototipo' : 'prototipos'}
            </Badge>
          )}
          
          {!isLoading && amenidades.slice(0, 3).map((amenidadId) => {
            const amenidadInfo = getAmenidadInfo(amenidadId);
            return (
              <Badge 
                key={amenidadId} 
                variant="outline" 
                className="flex items-center gap-1 bg-slate-50"
              >
                {amenidadInfo.icon}
                <span className="text-xs">{amenidadInfo.name}</span>
              </Badge>
            );
          })}
          
          {!isLoading && amenidades.length > 3 && (
            <Badge variant="outline" className="bg-slate-50">
              +{amenidades.length - 3}
            </Badge>
          )}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div>
            <p className="text-slate-500">Unidades</p>
            <p className="font-medium flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              {isLoading ? "..." : getUnitCountDisplay()} disponibles
            </p>
          </div>
          <div>
            <p className="text-slate-500">Avance</p>
            <p className="font-medium">
              {isLoading ? "..." : (
                unidadesStats.total > 0 
                  ? Math.round(((unidadesStats.vendidas + unidadesStats.con_anticipo) / unidadesStats.total) * 100)
                  : 0
              )}%
            </p>
          </div>
        </div>
        
        <Button 
          variant="secondary"
          className="w-full mt-4"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(desarrollo.id);
          }}
        >
          Ver detalles
        </Button>
      </CardContent>
    </Card>
  );
};

const getAmenidadInfo = (amenidadId: string): { name: string; icon: React.ReactNode } => {
  const amenityMap: Record<string, { icon: React.ReactNode, name: string }> = {
    "pool": { icon: <Waves className="h-3 w-3 mr-1" />, name: "Alberca" },
    "gym": { icon: <Dumbbell className="h-3 w-3 mr-1" />, name: "Gimnasio" },
    "spa": { icon: <Bath className="h-3 w-3 mr-1" />, name: "Spa" },
    "bbq": { icon: <Flame className="h-3 w-3 mr-1" />, name: "BBQ" },
    "playground": { icon: <Baby className="h-3 w-3 mr-1" />, name: "Área infantil" },
    "security": { icon: <Lock className="h-3 w-3 mr-1" />, name: "Seguridad" },
    "parking": { icon: <ParkingSquare className="h-3 w-3 mr-1" />, name: "Estacionamiento" },
    "garden": { icon: <Trees className="h-3 w-3 mr-1" />, name: "Jardín" },
    "beach": { icon: <Waves className="h-3 w-3 mr-1" />, name: "Playa" },
    "restaurant": { icon: <Utensils className="h-3 w-3 mr-1" />, name: "Restaurante" },
    "bar": { icon: <GlassWater className="h-3 w-3 mr-1" />, name: "Bar" },
    "wifi": { icon: <Wifi className="h-3 w-3 mr-1" />, name: "WiFi" }
  };
  
  return amenityMap[amenidadId] || { name: amenidadId, icon: <Check className="h-3 w-3 mr-1" /> };
};

export default DesarrolloCard;
