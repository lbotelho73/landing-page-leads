
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function GoogleAuthGuide() {
  return (
    <Alert variant="destructive" className="mb-4 shadow-lg">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Configuração do Google Auth necessária</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2 font-medium">O erro de conexão com accounts.google.com indica que há uma incompatibilidade na configuração do OAuth.</p>
        <p className="mb-3">Siga estes passos cuidadosamente:</p>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Acesse o <a href="https://console.cloud.google.com/" className="underline font-medium" target="_blank" rel="noopener noreferrer">Console do Google Cloud</a></li>
          <li>Crie um novo projeto ou selecione um existente</li>
          <li>Na barra lateral, vá para "APIs e serviços" &gt; "Tela de consentimento OAuth"</li>
          <li>Configure a tela de consentimento como "Externa"</li>
          <li>Preencha as informações necessárias (nome do app, e-mail de contato)</li>
          <li>Em "Escopos autorizados", adicione os escopos:
            <ul className="list-disc pl-5 mt-1">
              <li>email</li>
              <li>profile</li>
              <li>openid</li>
            </ul>
          </li>
          <li>Vá para "APIs e serviços" &gt; "Credenciais"</li>
          <li>Clique em "Criar credenciais" &gt; "ID do cliente OAuth"</li>
          <li>Selecione "Aplicativo Web" como tipo de aplicativo</li>
          <li className="font-medium">Em "Origens JavaScript autorizadas", adicione <span className="bg-gray-100 px-1">https://cipgzfvvctekljfprezz.supabase.co</span> e a URL do seu site</li>
          <li className="font-medium">Em "URIs de redirecionamento autorizados", adicione <span className="bg-gray-100 px-1">https://cipgzfvvctekljfprezz.supabase.co/auth/v1/callback</span></li>
          <li>Clique em "Criar" para gerar o ID do cliente e o segredo</li>
          <li>No painel do Supabase, vá para Authentication &gt; Providers &gt; Google</li>
          <li>Cole o ID do cliente e o segredo do cliente e ative o provedor</li>
          <li className="font-medium">Em Authentication &gt; URL Configuration:
            <ul className="list-disc pl-5 mt-1">
              <li>Site URL: adicione seu site URL (ex: https://seuapp.com)</li>
              <li>Redirect URLs: adicione a mesma URL</li>
            </ul>
          </li>
          <li className="font-medium">Se estiver testando localmente, adicione também <span className="bg-gray-100 px-1">http://localhost:5173</span> nas Origens JavaScript e <span className="bg-gray-100 px-1">http://localhost:5173/auth/callback</span> nas URIs de redirecionamento</li>
          <li>Certifique-se de que o projeto Google Cloud tenha o OAuth consent screen configurado e publicado</li>
        </ol>
        <div className="mt-4 p-2 bg-blue-50 border border-blue-100 rounded-md">
          <p className="text-sm font-medium text-blue-800">Dica: Se você não conseguir configurar o Google Auth e precisar fazer testes rapidamente, use a autenticação por email/senha no Supabase como alternativa temporária.</p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
