
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVentas } from '@/hooks/ventas';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { VentaProgress } from './VentaProgress';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface VentasTableProps {
  refreshTrigger?: number;
  estadoFilter?: string;
  initialLoading?: boolean;
}

type VentaWithPayments = {
  id: string;
  progreso: number;
  montoPagado: number;
}

export const VentasTable = ({ refreshTrigger = 0, estadoFilter, initialLoading = false }: VentasTableProps) => {
  const { ventas, isLoading, refetch } = useVentas({ estado: estadoFilter });
  const [ventasPayments, setVentasPayments] = useState<Record<string, VentaWithPayments>>({});
  const [loadingPayments, setLoadingPayments] = useState(false);
  const { empresaId, isLoading: isUserRoleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const isInitialLoading = isLoading || isUserRoleLoading || initialLoading;
  
  console.log('VentasTable rendered with empresaId:', empresaId, 'ventas:', ventas.length, 'isLoading:', isLoading);
  
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Fetch all payments for ventas to accurately display progress
  useEffect(() => {
    const fetchVentasPayments = async () => {
      if (!ventas.length) return;
      
      setLoadingPayments(true);
      try {
        // First get all compradores_venta for all ventas
        const ventaIds = ventas.map(v => v.id);
        const { data: compradoresVenta, error: errorCompradores } = await supabase
          .from('compradores_venta')
          .select('id, venta_id')
          .in('venta_id', ventaIds);
        
        if (errorCompradores) throw errorCompradores;
        
        if (!compradoresVenta.length) {
          // No compradores found for any ventas
          const emptyPayments = ventaIds.reduce((acc, ventaId) => {
            acc[ventaId] = { id: ventaId, progreso: 0, montoPagado: 0 };
            return acc;
          }, {} as Record<string, VentaWithPayments>);
          setVentasPayments(emptyPayments);
          return;
        }
        
        // Group compradores by venta_id
        const compradoresByVenta = compradoresVenta.reduce((acc, item) => {
          if (!acc[item.venta_id]) {
            acc[item.venta_id] = [];
          }
          acc[item.venta_id].push(item.id);
          return acc;
        }, {} as Record<string, string[]>);
        
        // For each venta with compradores, fetch pagos
        const paymentsData: Record<string, VentaWithPayments> = {};
        
        for (const ventaId of ventaIds) {
          const compradorIds = compradoresByVenta[ventaId] || [];
          let montoPagado = 0;
          
          if (compradorIds.length > 0) {
            // Get pagos for each comprador - using 'registrado' state
            const { data: pagos, error: errorPagos } = await supabase
              .from('pagos')
              .select('monto, estado')
              .in('comprador_venta_id', compradorIds)
              .eq('estado', 'registrado');
            
            if (!errorPagos && pagos) {
              montoPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
            }
          }
          
          // Find the corresponding venta to calculate progress
          const venta = ventas.find(v => v.id === ventaId);
          const progreso = venta?.precio_total 
            ? Math.round((montoPagado / venta.precio_total) * 100)
            : 0;
          
          paymentsData[ventaId] = {
            id: ventaId,
            progreso,
            montoPagado
          };
          
          // Check if we need to update venta status based on payment progress
          if (progreso >= 100 && venta?.estado === 'en_proceso') {
            // Update venta status to 'completada'
            await supabase
              .from('ventas')
              .update({ 
                estado: 'completada',
                fecha_actualizacion: new Date().toISOString()
              })
              .eq('id', ventaId);
              
            // Update unidad status to 'vendido'
            if (venta?.unidad_id) {
              await supabase
                .from('unidades')
                .update({ estado: 'vendido' })
                .eq('id', venta.unidad_id);
            }
          }
        }
        
        setVentasPayments(paymentsData);
      } catch (error) {
        console.error('Error fetching payments data:', error);
      } finally {
        setLoadingPayments(false);
      }
    };
    
    fetchVentasPayments();
  }, [ventas]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'en_proceso':
        return <Badge variant="secondary">En Proceso</Badge>;
      case 'completada':
        return <Badge variant="success">Completada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  const handleRowClick = (ventaId: string) => {
    navigate(`/dashboard/ventas/${ventaId}`);
  };

  // Mostrar esqueletos durante la carga inicial
  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Loading de pagos, mostramos la tabla pero con un indicador
  if (loadingPayments && ventas.length > 0) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-medium w-[35%]">Desarrollo / Unidad</th>
                  <th className="text-left p-4 font-medium w-[12%]">Tipo</th>
                  <th className="text-left p-4 font-medium w-[15%]">Precio Total</th>
                  <th className="text-left p-4 font-medium w-[25%]">Progreso</th>
                  <th className="text-left p-4 font-medium w-[13%]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr 
                    key={venta.id} 
                    className="border-t hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{venta.unidad?.prototipo?.desarrollo?.nombre || 'Desarrollo'}</p>
                        <p className="text-sm text-muted-foreground">
                          {venta.unidad?.prototipo?.nombre || 'Prototipo'} - Unidad {venta.unidad?.numero || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {venta.es_fraccional ? (
                        <Badge variant="outline">Fraccional</Badge>
                      ) : (
                        <Badge variant="outline">Individual</Badge>
                      )}
                    </td>
                    <td className="p-4">{formatCurrency(venta.precio_total)}</td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                    <td className="p-4">{getEstadoBadge(venta.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  if (ventas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-64 text-center p-8">
        <PlusCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No hay ventas registradas para tu organización</h3>
        <p className="text-muted-foreground mb-6 max-w-lg">
          Actualiza el estado de tus unidades a "en proceso" para comenzar a dar seguimiento a tus ventas
        </p>
        <Button variant="outline" onClick={() => navigate('/dashboard/prototipos')}>
          Ver unidades
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-4 font-medium w-[35%]">Desarrollo / Unidad</th>
                <th className="text-left p-4 font-medium w-[12%]">Tipo</th>
                <th className="text-left p-4 font-medium w-[15%]">Precio Total</th>
                <th className="text-left p-4 font-medium w-[25%]">Progreso</th>
                <th className="text-left p-4 font-medium w-[13%]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => {
                const paymentData = ventasPayments[venta.id] || { progreso: 0, montoPagado: 0 };
                
                return (
                  <tr 
                    key={venta.id} 
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleRowClick(venta.id)}
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{venta.unidad?.prototipo?.desarrollo?.nombre || 'Desarrollo'}</p>
                        <p className="text-sm text-muted-foreground">
                          {venta.unidad?.prototipo?.nombre || 'Prototipo'} - Unidad {venta.unidad?.numero || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {venta.es_fraccional ? (
                        <Badge variant="outline">Fraccional</Badge>
                      ) : (
                        <Badge variant="outline">Individual</Badge>
                      )}
                    </td>
                    <td className="p-4">{formatCurrency(venta.precio_total)}</td>
                    <td className="p-4">
                      <VentaProgress 
                        progreso={paymentData.progreso} 
                        montoTotal={venta.precio_total} 
                        montoPagado={paymentData.montoPagado}
                      />
                    </td>
                    <td className="p-4">{getEstadoBadge(venta.estado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default VentasTable;
