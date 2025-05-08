
import { useState } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingChannels } from "@/components/marketing/MarketingChannels";
import { PerformanceAnalysis } from "@/components/marketing/PerformanceAnalysis";
import { ptBR } from '@/lib/i18n';

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState("channels");
  
  return (
    <AppLayout>
      <div className="page-container">
        <h1 className="text-3xl font-bold mb-6">{ptBR.marketing}</h1>
        
        <Tabs defaultValue="channels" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="channels">Canais de Marketing</TabsTrigger>
            <TabsTrigger value="performance">Análise de Desempenho</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels">
            <MarketingChannels />
          </TabsContent>
          
          <TabsContent value="performance">
            <PerformanceAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
