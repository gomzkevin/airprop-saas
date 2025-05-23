
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square, Home, Building2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { countUnidadesByStatus } from '@/hooks/unidades/countUtils';
import { supabase } from '@/integrations/supabase/client';

type PrototipoCardProps = {
  prototipo: Tables<"prototipos">;
  onClick?: (id: string) => void;
  onViewDetails?: (id: string) => void; // Added this prop to match usage in DesarrolloDetail
};

const PrototipoCard = ({ prototipo, onClick, onViewDetails }: PrototipoCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [unidadesStats, setUnidadesStats] = useState({
    disponibles: 0,
    vendidas: 0,
    con_anticipo: 0,
    total: 0
  });
  
  useEffect(() => {
    const fetchCardData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch image if available
        if (prototipo.imagen_url) {
          setImageUrl(prototipo.imagen_url);
        }
        
        // Get actual unit counts
        const unitStats = await countUnidadesByStatus(prototipo.id);
        setUnidadesStats(unitStats);
      } catch (error) {
        console.error('Error loading prototipo card data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCardData();
  }, [prototipo.id, prototipo.imagen_url]);
  
  const fallbackImage = "/placeholder.svg";
  
  const getUnitCountDisplay = () => {
    // Use the actual unit stats from the database for available/total count
    const available = unidadesStats.disponibles;
    const total = unidadesStats.total || prototipo.total_unidades || 0;
    
    return `${available}/${total}`;
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col transition hover:shadow-md">
      <div className="relative h-48 bg-slate-100">
        {isLoading ? (
          <div className="absolute inset-0 animate-pulse bg-slate-200" />
        ) : (
          <img
            src={imageUrl || fallbackImage}
            alt={prototipo.nombre}
            className="h-full w-full object-cover"
            onError={() => setImageUrl(fallbackImage)}
          />
        )}
        <Badge className="absolute top-2 right-2 bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
          {prototipo.tipo || 'Prototipo'}
        </Badge>
      </div>
      
      <CardContent className="flex-1 p-5">
        <h3 className="font-bold text-xl mb-2">{prototipo.nombre}</h3>
        
        <div className="flex items-center text-indigo-600 font-semibold mb-3">
          ${prototipo.precio?.toLocaleString('es-MX') || '0'}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Badge variant="outline" className="flex items-center justify-center gap-1 py-1">
            <Bed className="h-3.5 w-3.5" />
            <span>{prototipo.habitaciones || 0}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center justify-center gap-1 py-1">
            <Bath className="h-3.5 w-3.5" />
            <span>{prototipo.baños || 0}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center justify-center gap-1 py-1">
            <Square className="h-3.5 w-3.5" />
            <span>{prototipo.superficie || 0} m²</span>
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 text-slate-500 text-sm">
          <Building2 className="h-4 w-4" />
          <span>
            {isLoading ? (
              <span className="animate-pulse">Cargando unidades...</span>
            ) : (
              `${getUnitCountDisplay()} disponibles`
            )}
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            // Use onViewDetails if provided, otherwise fall back to onClick
            if (onViewDetails) {
              onViewDetails(prototipo.id);
            } else if (onClick) {
              onClick(prototipo.id);
            }
          }}
        >
          Ver detalles
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PrototipoCard;
