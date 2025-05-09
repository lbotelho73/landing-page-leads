import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ptBR } from '@/lib/i18n';
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from "@/lib/supabase-utils";
import { PaymentFilter } from "@/components/payments/PaymentFilter";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { format } from 'date-fns';
import { ptBR as ptBRLocale } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    fetchPayments();
  }, [dateRange, paymentStatus]);
  
  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Format dates for Supabase
      const fromDate = formatDateForSupabase(dateRange.from);
      const toDate = formatDateForSupabase(dateRange.to);
      
      console.log(`Fetching payments from ${fromDate} to ${toDate}, status: ${paymentStatus || 'all'}`);
      
      // Start building query
      let query = supabase
        .from('appointments')
        .select(`
          id, 
          date,
          final_price,
          primary_professional_id,
          professional_payment_status,
          professional_payment_date,
          professionals!primary_professional_id (
            first_name,
            last_name,
            commission_percentage
          ),
          services (
            name
          )
        `)
        .gte('date', fromDate)
        .lte('date', toDate);
        
      // Add status filter if selected
      if (paymentStatus) {
        query = query.eq('professional_payment_status', paymentStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log("Professional payments:", data);
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  };
  
  const calculateCommission = (payment: any) => {
    if (!payment?.professionals?.commission_percentage || !payment.final_price) return 0;
    
    const commissionPercentage = parseFloat(payment.professionals.commission_percentage);
    const finalPrice = parseFloat(payment.final_price);
    
    return (finalPrice * commissionPercentage) / 100;
  };
  
  const getTotalCommission = () => {
    return payments.reduce((total, payment) => {
      return total + calculateCommission(payment);
    }, 0);
  };
  
  // Format a date string to display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBRLocale });
    } catch (error) {
      return dateString;
    }
  };
  
  // Mark payment as paid
  const markAsPaid = async (id: string) => {
    try {
      const paymentDate = new Date();
      const formattedDate = formatDateForSupabase(paymentDate);
      
      const { error } = await supabase
        .from('appointments')
        .update({ 
          professional_payment_status: 'Paid',
          professional_payment_date: formattedDate
        })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success("Pagamento registrado com sucesso");
      fetchPayments(); // Refresh list
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar pagamento");
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <h1 className="text-3xl font-bold mb-6">{ptBR.payments}</h1>
        
        <PaymentFilter 
          onDateRangeChange={setDateRange} 
          dateRange={dateRange} 
          onStatusChange={setPaymentStatus}
          status={paymentStatus}
        />
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{ptBR.loadingData}</div>
            ) : (
              <>
                <div className="mb-4 bg-accent p-3 rounded-md">
                  <div className="font-medium">Total a pagar: {formatCurrency(getTotalCommission())}</div>
                  <div className="text-sm text-muted-foreground">
                    {payments.length} atendimentos no período selecionado
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Pgto.</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length > 0 ? (
                      payments.map((payment) => {
                        const commission = calculateCommission(payment);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell>
                              {payment.professionals?.first_name} {payment.professionals?.last_name}
                            </TableCell>
                            <TableCell>{payment.services?.name || "Não especificado"}</TableCell>
                            <TableCell>{formatCurrency(payment.final_price)}</TableCell>
                            <TableCell>{formatCurrency(commission)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                payment.professional_payment_status === "Paid" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-amber-100 text-amber-800"
                              }`}>
                                {payment.professional_payment_status === "Paid" ? "Pago" : "A Pagar"}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(payment.professional_payment_date)}</TableCell>
                            <TableCell>
                              {payment.professional_payment_status !== "Paid" && (
                                <button
                                  onClick={() => markAsPaid(payment.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Marcar como pago
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                          Nenhum pagamento para o período selecionado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
