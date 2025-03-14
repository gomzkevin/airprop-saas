
import { useState } from 'react';
import { MapPin, Bed, Bath, Square, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface PropertyCardProps {
  image: string;
  title: string;
  location: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  category: string;
}

const PropertyCard = ({ 
  image, 
  title, 
  location, 
  price, 
  bedrooms, 
  bathrooms, 
  area,
  category
}: PropertyCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="overflow-hidden rounded-xl bg-white border border-slate-100 shadow-soft transition-all duration-300 hover:shadow-medium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Property Image */}
      <div className="relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
          <img 
            src={image} 
            alt={title}
            className={`object-cover w-full h-full transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
            loading="lazy"
            onLoad={(e) => {
              (e.target as HTMLElement).parentElement?.querySelector('.animate-pulse')?.classList.add('hidden');
            }}
          />
        </AspectRatio>
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-full shadow-sm">
            {category}
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{location}</span>
        </div>
        
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        
        <p className="text-lg font-semibold text-indigo-600 mb-4">{price}</p>
        
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div className="flex space-x-4 text-slate-700">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1 text-slate-400" />
              <span className="text-sm">{bedrooms}</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1 text-slate-400" />
              <span className="text-sm">{bathrooms}</span>
            </div>
            <div className="flex items-center">
              <Square className="h-4 w-4 mr-1 text-slate-400" />
              <span className="text-sm">{area} m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="px-5 pb-5">
        <Button variant="outline" className="w-full justify-between group">
          <span>Ver detalles</span>
          <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};

export default PropertyCard;
