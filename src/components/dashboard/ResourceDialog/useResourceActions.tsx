
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { ResourceType } from './types';

interface UseResourceActionsProps {
  resourceType: ResourceType;
  resourceId?: string;
  onSuccess?: (resource: any) => void;
  onError?: (error: Error) => void;
  selectedAmenities?: string[];
  clientConfig?: {
    isExistingClient: boolean;
    newClientData: {
      nombre: string;
      email: string;
      telefono: string;
    };
  };
}

const getTableName = (resourceType: string): string => {
  // Direct mapping to valid table names
  const tableMapping: Record<string, string> = {
    'desarrollos': 'desarrollos',
    'prototipos': 'prototipos',
    'leads': 'leads',
    'cotizaciones': 'cotizaciones',
    'unidades': 'unidades'
  };
  
  const tableName = tableMapping[resourceType];
  if (!tableName) {
    throw new Error(`Invalid resource type: ${resourceType}`);
  }
  
  return tableName;
};

const useResourceActions = ({
  resourceType,
  resourceId,
  onSuccess,
  onError,
  selectedAmenities = [],
  clientConfig
}: UseResourceActionsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [resourceData, setResourceData] = useState<any | null>(null);
  const { toast } = useToast();
  const { userData } = useUserRole();

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${resourceType}_${Date.now()}.${fileExt}`;
      const filePath = `${resourceType}s/${fileName}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error } = await supabase.storage
        .from('prototipo-images')
        .upload(filePath, file);
        
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('prototipo-images')
        .getPublicUrl(filePath);
        
      setIsLoading(false);
      
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setIsLoading(false);
      toast({
        title: 'Error',
        description: `Error al subir imagen: ${error.message}`,
        variant: 'destructive',
      });
      return null;
    }
  };

  const saveResource = async (data: any) => {
    setIsLoading(true);
    
    try {
      // Get the appropriate table name
      const tableName = getTableName(resourceType);
      
      console.log(`Saving ${resourceType} data:`, data);
      
      // Process amenities if available
      if (resourceType === 'desarrollos' && selectedAmenities.length > 0) {
        data.amenidades = JSON.stringify(selectedAmenities);
      }
      
      // Check for empresa_id
      if (resourceType === 'desarrollos' || resourceType === 'leads') {
        const { data: hasColumn } = await supabase
          .rpc('has_column', { 
            table_name: tableName, 
            column_name: 'empresa_id' 
          });
          
        if (hasColumn && userData?.empresaId) {
          data.empresa_id = userData.empresaId;
        }
      }
      
      // Create new lead if necesary for cotización with new client
      if (resourceType === 'cotizaciones' && clientConfig && !clientConfig.isExistingClient) {
        const { nombre, email, telefono } = clientConfig.newClientData;
        
        // Validate data
        if (!nombre) {
          toast({
            title: 'Error',
            description: 'El nombre del cliente es requerido',
            variant: 'destructive',
          });
          setIsLoading(false);
          return false;
        }
        
        // Create new lead
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            nombre,
            email,
            telefono,
            estado: 'nuevo',
            subestado: 'sin_contactar'
          })
          .select();
          
        if (leadError) throw leadError;
        
        // Use the new lead ID
        data.lead_id = newLead[0].id;
      }
      
      let result;
      
      if (resourceId) {
        // Update existing resource
        const { data: updatedResource, error } = await supabase
          .from(tableName)
          .update(data)
          .eq('id', resourceId)
          .select();
          
        if (error) throw error;
        
        result = updatedResource[0];
        
        toast({
          title: `${resourceType.slice(0, -1).charAt(0).toUpperCase() + resourceType.slice(0, -1).slice(1)} actualizado`,
          description: `El ${resourceType.slice(0, -1)} ha sido actualizado exitosamente`,
        });
      } else {
        // Create new resource
        const { data: createdResource, error } = await supabase
          .from(tableName)
          .insert(data)
          .select();
          
        if (error) throw error;
        
        result = createdResource[0];
        
        // Handle development image for 'desarrollo' if needed
        if (resourceType === 'desarrollos' && data.imagen_url) {
          const imageUrl = data.imagen_url;
          
          const { error: imageError } = await supabase
            .from('desarrollo_imagenes')
            .insert({
              desarrollo_id: result.id,
              url: imageUrl,
              es_principal: true,
              orden: 1,
            });
            
          if (imageError) {
            console.error('Error uploading image:', imageError);
            toast({
              title: 'Error',
              description: 'Error al subir la imagen',
              variant: 'destructive',
            });
          }
        }
        
        toast({
          title: `${resourceType.slice(0, -1).charAt(0).toUpperCase() + resourceType.slice(0, -1).slice(1)} creado`,
          description: `El ${resourceType.slice(0, -1)} ha sido creado exitosamente`,
        });
      }
      
      setIsLoading(false);
      setResourceData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return true;
    } catch (error: any) {
      console.error(`Error saving ${resourceType}:`, error);
      setIsLoading(false);
      toast({
        title: 'Error',
        description: `No se pudo guardar el ${resourceType.slice(0, -1)}: ${error.message}`,
        variant: 'destructive',
      });
      
      if (onError) {
        onError(error);
      }
      
      return false;
    }
  };

  return {
    isLoading,
    resourceData,
    saveResource,
    handleImageUpload
  };
};

export default useResourceActions;
