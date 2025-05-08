
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center p-4" 
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1649972904349-6e44c42644a7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVuY2F8MHx8fHx8&auto=format&fit=crop&w=1200&q=80')" }}>
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-massage-800">Sensual Flow</h1>
          <p className="text-massage-600">Sistema de Gestão de Clínicas</p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
