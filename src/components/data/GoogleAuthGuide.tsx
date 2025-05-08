
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function GoogleAuthGuide() {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Configuração do Google Auth necessária</AlertTitle>
      <AlertDescription>
        <p>Para configurar a autenticação do Google, siga os passos abaixo:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
          <li>Acesse o <a href="https://console.cloud.google.com/" className="underline" target="_blank" rel="noopener noreferrer">Console do Google Cloud</a></li>
          <li>Crie um novo projeto ou selecione um existente</li>
          <li>Na barra lateral, vá para "APIs e serviços" &gt; "Tela de permissão OAuth"</li>
          <li>Configure a tela de consentimento</li>
          <li>Vá para "APIs e serviços" &gt; "Credenciais"</li>
          <li>Clique em "Criar credenciais" &gt; "ID do cliente OAuth"</li>
          <li>Selecione "Aplicativo Web" como tipo de aplicativo</li>
          <li>Em "Origens JavaScript autorizadas", adicione a URL do seu site (ex: https://seu-projeto.lovable.app)</li>
          <li>Em "URIs de redirecionamento autorizados", adicione a URL de callback do Supabase (ex: https://seu-projeto.supabase.co/auth/v1/callback)</li>
          <li>Copie o ID do cliente e o segredo do cliente</li>
          <li>No painel do Supabase, vá para Autenticação &gt; Provedores &gt; Google</li>
          <li>Cole o ID do cliente e o segredo do cliente e ative o provedor</li>
          <li>Em Autenticação &gt; Configuração de URL, adicione sua URL de site e URL de redirecionamento</li>
        </ol>
      </AlertDescription>
    </Alert>
  );
}
