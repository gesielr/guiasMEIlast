import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { paymentService } from "../../services/paymentService";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Alert } from "../../components/ui/Alert";

export function PaymentPage() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const userId = params.get("user_id");

  useEffect(() => {
    if (!userId) {
      setError("ID de usuário não fornecido. Por favor, retorne e tente novamente.");
      return;
    }

    const initiatePayment = async () => {
      try {
        const checkoutUrl = await paymentService.createCheckoutSession(
          userId,
          120,
          "Adesão Rebelo App"
        );
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error("Não foi possível obter a URL de pagamento.");
        }
      } catch (err) {
        setError((err as Error).message || "Ocorreu um erro desconhecido ao iniciar o pagamento.");
      }
    };

    initiatePayment();
  }, [userId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <Card className="w-full max-w-md text-center">
        {error ? (
          <>
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
            <h2 className="mb-2 text-2xl font-bold text-slate-900">❌ Erro no Pagamento</h2>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              Ir para o Dashboard
            </Button>
          </>
        ) : (
          <>
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Processando seu Pagamento</h2>
            <p className="text-slate-600">
              Por favor, aguarde. Estamos preparando um ambiente seguro para você e em instantes
              você será redirecionado para o Stripe.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

export default PaymentPage;
