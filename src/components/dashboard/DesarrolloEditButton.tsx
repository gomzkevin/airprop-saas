
import { Button } from '@/components/ui/button';
import { EditIcon } from 'lucide-react';
import { useUserRole } from '@/hooks';
import { Tables } from '@/integrations/supabase/types';
import AdminResourceDialog from './ResourceDialog/AdminResourceDialog';

type Desarrollo = Tables<"desarrollos">;

interface DesarrolloEditButtonProps {
  desarrollo: Desarrollo;
  onSuccess: () => void;
}

const DesarrolloEditButton = ({ desarrollo, onSuccess }: DesarrolloEditButtonProps) => {
  const { isAdmin } = useUserRole();
  
  // Si no es administrador, no mostrar el botón de edición
  if (!isAdmin()) {
    return null;
  }
  
  return (
    <AdminResourceDialog 
      resourceType="desarrollos"
      buttonText="Editar desarrollo" 
      buttonIcon={<EditIcon className="h-4 w-4 mr-2" />}
      buttonVariant="outline"
      resourceId={desarrollo.id}
      onSuccess={onSuccess}
    />
  );
};

export default DesarrolloEditButton;
