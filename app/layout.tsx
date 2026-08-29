import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Produção Científica PPGE UFSCar",description:"Explore artigos de periódicos dos docentes do PPGE/UFSCar, integrados por ORCID e OpenAlex.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
