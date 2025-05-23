
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface UserData {
  id: string;
  email: string;
  role: string;
  name?: string;
  isAdmin?: boolean;
  empresaId?: number;
}

export const useUserRole = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get the current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error fetching auth user:', authError);
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
        
        if (!user) {
          console.log('No authenticated user found');
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
        
        setUserId(user.id);
        setUserEmail(user.email);
        console.log('Auth user found:', user.id, user.email);
        
        // Get the user's role from the usuarios table
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();
        
        if (userError) {
          console.error('Error fetching user data:', userError);
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
        
        if (userData) {
          console.log('User data loaded:', userData);
          setUserRole(userData.rol);
          setUserName(userData.nombre);
          
          // Set isAdmin based on is_company_admin flag or role being 'admin'
          const adminStatus = userData.is_company_admin || userData.rol === 'admin';
          console.log('Admin status:', adminStatus);
          setIsAdmin(adminStatus);
          
          // Important: Set empresaId for organization-based access
          setEmpresaId(userData.empresa_id);
          console.log('Empresa ID set:', userData.empresa_id);
        } else {
          console.log('No user data found in usuarios table');
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('Error in fetchUserData:', error);
        toast({
          title: 'Error',
          description: 'No se pudo obtener la información del usuario',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in, fetch their data
        setUserId(session.user.id);
        setUserEmail(session.user.email);
        
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('auth_id', session.user.id)
          .maybeSingle();
        
        if (!error && data) {
          console.log('User data from auth change:', data);
          setUserRole(data.rol);
          setUserName(data.nombre);
          
          // Set isAdmin based on is_company_admin flag or role being 'admin'
          const adminStatus = data.is_company_admin || data.rol === 'admin';
          console.log('Admin status after auth change:', adminStatus);
          setIsAdmin(adminStatus);
          
          // Important: Set empresaId for organization-based access
          setEmpresaId(data.empresa_id);
          console.log('Empresa ID after auth change:', data.empresa_id);
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear their data
        setUserId(null);
        setUserEmail(null);
        setUserRole(null);
        setUserName(null);
        setIsAdmin(false);
        setEmpresaId(null);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Helper methods
  const isUserAdmin = () => {
    return isAdmin;
  };

  // Actualizado: Ahora solo admins pueden crear prototipos
  const canCreateResource = (resourceType?: string) => {
    // Si es admin, puede crear cualquier recurso
    if (isAdmin) return true;
    
    // Si es vendedor, solo puede crear ciertos recursos
    if (userRole === 'vendedor') {
      // Vendedores no pueden crear prototipos
      if (resourceType === 'prototipos') return false;
      
      // Para otros recursos (leads, cotizaciones, etc.), sí pueden
      return true;
    }
    
    return false;
  };

  return {
    userId,
    userEmail,
    userRole,
    userName,
    isAdmin: isUserAdmin,
    canCreateResource,
    empresaId,
    isLoading,
    authChecked,
    role: userRole // Alias for compatibility
  };
};

export default useUserRole;
