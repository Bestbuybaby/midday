import React from 'react'

export default function page() {
  return (
    <div>page</div>
  )
}


// // apps/website/src/app/open-startup/page.tsx
// // Make the page static - this prevents Supabase client initialization during build
// export const dynamic = 'force-static'
// export const revalidate = 3600 // Revalidate every hour

// import { BankConnectionsChart } from "@/components/charts/bank-connections-chart";
// import { InboxChart } from "@/components/charts/inbox-chart";
// import { InvoiceCustomersChart } from "@/components/charts/invoice-customers";
// import { InvoicesChart } from "@/components/charts/invoices-chart";
// import { ReportsChart } from "@/components/charts/reports-chart";
// import { TrackerEntriesChart } from "@/components/charts/tracker-entries-chart";
// import { TrackerProjectsChart } from "@/components/charts/tracker-projects-chart";
// import { TransactionEnrichmentsChart } from "@/components/charts/transaction-enrichments-chart";
// import { TransactionsChart } from "@/components/charts/transactions-chart";
// import { UsersChart } from "@/components/charts/users-chart";
// import { VaultChart } from "@/components/charts/vault-chart";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@midday/ui/table";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
// import { Metadata } from "next";

// export const metadata: Metadata = {
//   title: "Open Startup",
//   description:
//     "We value transparency and aim to keep you informed about our journey every step of the way.",
// };

// // Safe component wrapper that handles missing Supabase credentials
// const SafeChart = ({ children }: { children: React.ReactNode }) => {
//   // Check if Supabase credentials are available
//   const hasSupabaseCredentials =
//     process.env.NEXT_PUBLIC_SUPABASE_URL &&
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

//   if (!hasSupabaseCredentials) {
//     return (
//       <div className="border rounded-lg p-6 h-[300px] flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-sm text-muted-foreground">Chart data unavailable</p>
//           <p className="text-xs text-muted-foreground mt-1">
//             Supabase credentials required
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return <>{children}</>;
// };

// export default function Page() {
//   const hasSupabaseCredentials =
//     process.env.NEXT_PUBLIC_SUPABASE_URL &&
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

//   return (
//     <div className="container max-w-[1050px]">
//       <h1 className="mt-24 font-medium text-center text-5xl mb-8">
//         Open Startup
//       </h1>

//       <p className="text-[#878787] font-sm text-center max-w-[550px] m-auto">
//         We value transparency and aim to keep you informed about our journey
//         every step of the way.
//       </p>

//       {!hasSupabaseCredentials && (
//         <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center max-w-[550px] m-auto">
//           <p className="text-amber-800 text-sm">
//             Note: Charts require Supabase credentials to display live data.
//             Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.
//           </p>
//         </div>
//       )}

//       <Tabs defaultValue="metrics">
//         <TabsList className="p-0 h-auto space-x-6 bg-transparent flex items-center mt-8">
//           <TabsTrigger className="p-0 !bg-transparent" value="metrics">
//             Metrics
//           </TabsTrigger>
//           <TabsTrigger className="p-0 !bg-transparent" value="values">
//             Company values
//           </TabsTrigger>
//           <TabsTrigger className="p-0 !bg-transparent" value="table">
//             Cap table
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="metrics" className="m-0 h-full">
//           <div className="grid md:grid-cols-2 gap-6 mt-12">
//             <SafeChart>
//               <UsersChart />
//             </SafeChart>
//             <SafeChart>
//               <TransactionsChart />
//             </SafeChart>
//             <SafeChart>
//               <TransactionEnrichmentsChart />
//             </SafeChart>
//             <SafeChart>
//               <BankConnectionsChart />
//             </SafeChart>
//             <SafeChart>
//               <VaultChart />
//             </SafeChart>
//             <SafeChart>
//               <InvoicesChart />
//             </SafeChart>
//             <SafeChart>
//               <InvoiceCustomersChart />
//             </SafeChart>
//             <SafeChart>
//               <TrackerEntriesChart />
//             </SafeChart>
//             <SafeChart>
//               <TrackerProjectsChart />
//             </SafeChart>
//             <SafeChart>
//               <InboxChart />
//             </SafeChart>
//             <SafeChart>
//               <ReportsChart />
//             </SafeChart>
//           </div>
//         </TabsContent>

//         <TabsContent
//           value="values"
//           className="h-full max-w-[800px] m-auto mt-10"
//         >
//           <h2 className="text-2xl mb-4">Transparency</h2>
//           <p className="mb-10 text-[#878787]">
//             We prioritize transparency as we believe it is essential for
//             fostering trust and credibility in all aspects of our operations.
//             It's not just a value, it's the foundation of our relationships with
//             users alike. We prioritize clear and accurate information for users,
//             empowering them to make informed decisions confidently. We uphold
//             transparency with our users, offering open communication about
//             financial performance and strategies to maintain strong, mutually
//             beneficial relationships.
//           </p>

//           <h2 className="text-2xl mb-4">Expectation</h2>
//           <p className="mb-10 text-[#878787]">
//             Accurately setting expectations is crucial, directly tied to our
//             dedication to transparency. We've observed many startups fall short
//             due to overpromising, highlighting the importance of aligning
//             promises with reality. By maintaining this alignment, we cultivate
//             trust and integrity, fostering a culture of accountability guided by
//             transparency.
//           </p>

//           <h2 className="text-2xl mb-4">Strategic Growth</h2>
//           <p className="mb-10 text-[#878787]">
//             We firmly believe in the potential of assembling the right team to
//             build a highly profitable company. However, we also recognize that
//             size doesn't necessarily equate to success. Having experienced the
//             inefficiencies of overbloated organizations firsthand, we understand
//             the importance of agility and efficiency. For us, it's not about the
//             number of seats we fill, but rather the quality of individuals we
//             bring on board. Hence, our focus lies in growing intelligently,
//             prioritizing talent and effectiveness over sheer size.
//           </p>
//         </TabsContent>

//         <TabsContent
//           value="table"
//           className="h-full max-w-[800px] m-auto mt-10"
//         >
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead className="w-[100px]">Shareholders</TableHead>
//                 <TableHead>Capital</TableHead>
//                 <TableHead>Total shares</TableHead>
//                 <TableHead className="text-right">% Ownership</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               <TableRow>
//                 <TableCell>Founders</TableCell>
//                 <TableCell>0</TableCell>
//                 <TableCell>100</TableCell>
//                 <TableCell className="text-right">100%</TableCell>
//               </TableRow>
//             </TableBody>
//           </Table>
//           <p className="text-xs text-center mt-4 text-[#878787]">
//             Midday Labs AB
//           </p>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }