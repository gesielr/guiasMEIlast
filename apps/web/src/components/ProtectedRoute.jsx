// apps/web/src/components/ProtectedRoute.jsx
// Componente para proteger rotas e redirecionar MEI/Autônomo para WhatsApp

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

const ProtectedRoute = ({ children, allowedUserTypes = [] }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          navigate('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError);
          navigate('/login');
          return;
        }

        const userType = profileData?.user_type;

        // Se MEI ou Autônomo tentar acessar qualquer rota protegida, redirecionar para WhatsApp
        if (userType === 'mei' || userType === 'autonomo') {
          const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Quero acessar meu atendimento no GuiasMEI.')}`;
          
          // Mostrar mensagem antes de redirecionar
          alert('🔒 Acesso restrito\n\nMEIs e Autônomos devem usar o atendimento via WhatsApp.\n\nVocê será redirecionado agora...');
          
          window.location.href = whatsappLink;
          return;
        }

        // Se a rota tem tipos permitidos específicos, verificar
        if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(userType)) {
          // Redirecionar baseado no tipo de usuário
          if (userType === 'partner') {
            navigate('/dashboard/parceiro');
          } else if (userType === 'admin') {
            navigate('/dashboard/admin');
          } else {
            navigate('/');
          }
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, allowedUserTypes]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verificando permissões...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

