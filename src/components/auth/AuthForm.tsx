
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ptBR from "@/lib/i18n";
import { AlertCircle } from "lucide-react";
import { UserProfileRole } from "@/database.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserProfileRole>("viewer");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro no login:", error);
      setError("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }
    
    try {
      // 1. Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });
      
      if (error) {
        setError(error.message);
        return;
      }
      
      // 2. If user was created, create or update the user profile
      if (data?.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: email,
            role: role
          });
          
        if (profileError) {
          console.error("Error creating user profile:", profileError);
          toast.error("Erro ao criar perfil de usuário");
        }
      }
      
      toast.success("Cadastro realizado com sucesso!", {
        description: "Verifique seu email para instruções de confirmação."
      });
      
      // Se o email não precisar de verificação, redirecione automaticamente
      if (data?.user && !data.user.identities?.[0].identity_data.email_verified) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Erro no cadastro:", error);
      setError("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (error) {
      console.error("Erro no login com Google:", error);
      setError("Ocorreu um erro ao tentar login com Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar no Aplicativo</CardTitle>
        <CardDescription className="text-center">Entre com seus dados para acessar sua conta</CardDescription>
      </CardHeader>
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Cadastrar-se</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="text-sm text-massage-600 hover:text-massage-500">
                    {ptBR.forgotPassword}
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-massage-500 hover:bg-massage-600" 
                disabled={isLoading}
              >
                {isLoading ? "Carregando..." : "Entrar"}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">OU CONTINUE COM</span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex gap-2 items-center" 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
                  <path fill="#FFC107" d="M43.6,20.1H42V20H24v8h11.3c-1.6,4.7-6.1,8-11.3,8c-6.6,0-12-5.4-12-12s5.4-12,12-12c3.1,0,5.8,1.2,8,3l5.7-5.7 C34,6.1,29.3,4,24,4C13,4,4,13,4,24s9,20,20,20s20-9,20-20C44,22.7,43.9,21.4,43.6,20.1z"/>
                  <path fill="#FF3D00" d="M6.3,14.7l6.6,4.8c1.8-4.3,6-7.4,11.1-7.4c3.1,0,5.8,1.2,8,3l5.7-5.7C34,6.1,29.3,4,24,4 C16.2,4,9.4,8.3,6.3,14.7z"/>
                  <path fill="#4CAF50" d="M24,44c5.2,0,9.9-2,13.4-5.2l-6.2-5.2c-2,1.4-4.6,2.2-7.2,2.2c-5.2,0-9.6-3.3-11.3-7.9l-6.5,5 C9.5,39.6,16.2,44,24,44z"/>
                  <path fill="#1976D2" d="M43.6,20.1H42V20H24v8h11.3c-0.8,2.2-2.2,4.2-4.1,5.6c0,0,0,0,0,0l6.2,5.2C36.9,39.2,44,34,44,24 C44,22.7,43.9,21.4,43.6,20.1z"/>
                </svg>
                {ptBR.loginWithGoogle}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
        <TabsContent value="register">
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">{ptBR.fullName}</Label>
                <Input 
                  id="name" 
                  type="text" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="m@example.com" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Senha</Label>
                <Input 
                  id="register-password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{ptBR.passwordConfirmation}</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Função</Label>
                <Select
                  value={role}
                  onValueChange={(value: UserProfileRole) => setRole(value)}
                >
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-massage-500 hover:bg-massage-600" 
                disabled={isLoading}
              >
                {isLoading ? "Processando..." : ptBR.createAccount}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">OU CONTINUE COM</span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex gap-2 items-center" 
                onClick={handleGoogleLogin} 
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
                  <path fill="#FFC107" d="M43.6,20.1H42V20H24v8h11.3c-1.6,4.7-6.1,8-11.3,8c-6.6,0-12-5.4-12-12s5.4-12,12-12c3.1,0,5.8,1.2,8,3l5.7-5.7 C34,6.1,29.3,4,24,4C13,4,4,13,4,24s9,20,20,20s20-9,20-20C44,22.7,43.9,21.4,43.6,20.1z"/>
                  <path fill="#FF3D00" d="M6.3,14.7l6.6,4.8c1.8-4.3,6-7.4,11.1-7.4c3.1,0,5.8,1.2,8,3l5.7-5.7C34,6.1,29.3,4,24,4 C16.2,4,9.4,8.3,6.3,14.7z"/>
                  <path fill="#4CAF50" d="M24,44c5.2,0,9.9-2,13.4-5.2l-6.2-5.2c-2,1.4-4.6,2.2-7.2,2.2c-5.2,0-9.6-3.3-11.3-7.9l-6.5,5 C9.5,39.6,16.2,44,24,44z"/>
                  <path fill="#1976D2" d="M43.6,20.1H42V20H24v8h11.3c-0.8,2.2-2.2,4.2-4.1,5.6c0,0,0,0,0,0l6.2,5.2C36.9,39.2,44,34,44,24 C44,22.7,43.9,21.4,43.6,20.1z"/>
                </svg>
                {ptBR.loginWithGoogle}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
