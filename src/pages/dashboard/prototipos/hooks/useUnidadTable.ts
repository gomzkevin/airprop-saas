
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import useUnidades from "@/hooks/useUnidades";
import useLeads from "@/hooks/useLeads";
import { ExtendedPrototipo } from '@/hooks/usePrototipos';

interface UseUnidadTableProps {
  prototipo: ExtendedPrototipo;
  externalUnidades?: any[];
  externalLoading?: boolean;
  externalRefresh?: () => void;
}

export const useUnidadTable = ({ 
  prototipo, 
  externalUnidades, 
  externalLoading, 
  externalRefresh 
}: UseUnidadTableProps) => {
  const { toast } = useToast();
  const { 
    unidades: hookUnidades, 
    isLoading: hookLoading, 
    createUnidad, 
    updateUnidad, 
    deleteUnidad, 
    refetch: hookRefresh 
  } = useUnidades({ prototipo_id: prototipo.id });
  
  const { leads } = useLeads();
  
  // Use either the external or hook data
  const unidades = externalUnidades || hookUnidades;
  const isLoading = externalLoading !== undefined ? externalLoading : hookLoading;
  const refetch = externalRefresh || hookRefresh;
  
  // Use refs to avoid race conditions
  const isProcessingRef = useRef(false);
  const pendingOperationRef = useRef<null | (() => Promise<void>)>(null);
  
  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUnidad, setCurrentUnidad] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Helper function to normalize price
  const normalizePrice = (price: any): number | undefined => {
    if (price === undefined || price === null) return undefined;
    
    if (typeof price === 'string') {
      // Remove currency symbols and commas
      return parseFloat(price.replace(/[$,]/g, ''));
    }
    
    return Number(price);
  };

  // Process any pending operations
  const processPendingOperation = useCallback(async () => {
    if (pendingOperationRef.current) {
      try {
        await pendingOperationRef.current();
      } catch (error) {
        console.error("Error in pending operation:", error);
      } finally {
        pendingOperationRef.current = null;
      }
    }
  }, []);
  
  useEffect(() => {
    if (!isProcessing && pendingOperationRef.current) {
      processPendingOperation();
    }
  }, [isProcessing, processPendingOperation]);

  const handleAddUnidad = useCallback(async (data: any) => {
    if (isProcessingRef.current) {
      // Queue the operation for later if already processing
      const operation = async () => {
        try {
          await createUnidad({
            prototipo_id: prototipo.id,
            numero: data.numero,
            estado: data.estado,
            nivel: data.nivel,
            precio_venta: normalizePrice(data.precio_venta),
            comprador_id: data.comprador_id,
            comprador_nombre: data.comprador_nombre,
            vendedor_id: data.vendedor_id,
            vendedor_nombre: data.vendedor_nombre,
            fecha_venta: data.fecha_venta
          });
          
          toast({
            title: "Unidad creada",
            description: "La unidad ha sido creada exitosamente"
          });
          
          refetch();
        } catch (error: any) {
          console.error("Error creating unidad:", error);
          toast({
            title: "Error",
            description: `No se pudo crear la unidad: ${error.message}`,
            variant: "destructive"
          });
        }
      };
      
      pendingOperationRef.current = operation;
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      console.log('Creando unidad con datos:', data);
      
      await createUnidad({
        prototipo_id: prototipo.id,
        numero: data.numero,
        estado: data.estado,
        nivel: data.nivel,
        precio_venta: normalizePrice(data.precio_venta),
        comprador_id: data.comprador_id,
        comprador_nombre: data.comprador_nombre,
        vendedor_id: data.vendedor_id,
        vendedor_nombre: data.vendedor_nombre,
        fecha_venta: data.fecha_venta
      });
      
      toast({
        title: "Unidad creada",
        description: "La unidad ha sido creada exitosamente"
      });
      
      // Wait before refreshing
      setTimeout(() => {
        refetch();
        setTimeout(() => {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 500);
      }, 500);
    } catch (error: any) {
      console.error("Error creating unidad:", error);
      toast({
        title: "Error",
        description: `No se pudo crear la unidad: ${error.message}`,
        variant: "destructive"
      });
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [prototipo.id, createUnidad, toast, refetch]);

  const handleEditUnidad = useCallback(async (data: any) => {
    if (!currentUnidad) return;
    
    if (isProcessingRef.current) {
      // Queue the operation for later if already processing
      const operation = async () => {
        try {
          await updateUnidad({
            id: currentUnidad.id,
            numero: data.numero,
            estado: data.estado,
            nivel: data.nivel,
            precio_venta: normalizePrice(data.precio_venta),
            comprador_id: data.comprador_id,
            comprador_nombre: data.comprador_nombre,
            vendedor_id: data.vendedor_id,
            vendedor_nombre: data.vendedor_nombre,
            fecha_venta: data.fecha_venta
          });
          
          toast({
            title: "Unidad actualizada",
            description: "La unidad ha sido actualizada exitosamente"
          });
          
          refetch();
        } catch (error: any) {
          console.error("Error updating unidad:", error);
          toast({
            title: "Error",
            description: `No se pudo actualizar la unidad: ${error.message}`,
            variant: "destructive"
          });
        }
      };
      
      pendingOperationRef.current = operation;
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      const unidadId = currentUnidad.id;
      
      console.log('Actualizando unidad:', unidadId, 'con datos:', data);
      
      await updateUnidad({
        id: unidadId,
        numero: data.numero,
        estado: data.estado,
        nivel: data.nivel,
        precio_venta: normalizePrice(data.precio_venta),
        comprador_id: data.comprador_id,
        comprador_nombre: data.comprador_nombre,
        vendedor_id: data.vendedor_id,
        vendedor_nombre: data.vendedor_nombre,
        fecha_venta: data.fecha_venta
      });
      
      toast({
        title: "Unidad actualizada",
        description: "La unidad ha sido actualizada exitosamente"
      });
      
      // Wait before refreshing
      setTimeout(() => {
        refetch();
        setTimeout(() => {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 500);
      }, 500);
    } catch (error: any) {
      console.error("Error updating unidad:", error);
      toast({
        title: "Error",
        description: `No se pudo actualizar la unidad: ${error.message}`,
        variant: "destructive"
      });
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [currentUnidad, updateUnidad, toast, refetch]);

  const handleDeleteUnidad = useCallback(async () => {
    if (!currentUnidad) return;
    
    if (isProcessingRef.current) {
      // Queue the operation for later if already processing
      const operation = async () => {
        try {
          await deleteUnidad(currentUnidad.id);
          
          toast({
            title: "Unidad eliminada",
            description: "La unidad ha sido eliminada exitosamente"
          });
          
          refetch();
        } catch (error: any) {
          console.error("Error deleting unidad:", error);
          toast({
            title: "Error",
            description: `No se pudo eliminar la unidad: ${error.message}`,
            variant: "destructive"
          });
        }
      };
      
      pendingOperationRef.current = operation;
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      const unidadId = currentUnidad.id;
      console.log('Eliminando unidad:', unidadId);
      
      await deleteUnidad(unidadId);
      
      toast({
        title: "Unidad eliminada",
        description: "La unidad ha sido eliminada exitosamente"
      });
      
      // Wait before refreshing
      setTimeout(() => {
        refetch();
        setTimeout(() => {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }, 500);
      }, 500);
    } catch (error: any) {
      console.error("Error deleting unidad:", error);
      toast({
        title: "Error",
        description: `No se pudo eliminar la unidad: ${error.message}`,
        variant: "destructive"
      });
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [currentUnidad, deleteUnidad, toast, refetch]);

  const openEditDialog = useCallback((unidad: any) => {
    if (isProcessingRef.current) return;
    setCurrentUnidad(unidad);
    setIsEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((unidad: any) => {
    if (isProcessingRef.current) return;
    setCurrentUnidad(unidad);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    // Wait before clearing the current unidad
    setTimeout(() => {
      setCurrentUnidad(null);
    }, 300);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    // Wait before clearing the current unidad
    setTimeout(() => {
      setCurrentUnidad(null);
    }, 300);
  }, []);

  // Clean up function for the component
  useEffect(() => {
    return () => {
      isProcessingRef.current = false;
      pendingOperationRef.current = null;
      setCurrentUnidad(null);
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setIsProcessing(false);
    };
  }, []);

  return {
    unidades,
    isLoading,
    leads,
    isAddDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    currentUnidad,
    isProcessing,
    setIsAddDialogOpen,
    openEditDialog,
    openDeleteDialog,
    closeEditDialog,
    closeDeleteDialog,
    handleAddUnidad,
    handleEditUnidad,
    handleDeleteUnidad
  };
};

export default useUnidadTable;
