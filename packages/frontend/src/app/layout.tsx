import "./globals.css"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
    display: "swap",
})

export const metadata: Metadata = {
    title: "Predi-Book — Aggregated Prediction Market Order Book",
    description:
        "Real-time aggregated order book for prediction markets. Polymarket + Kalshi, unified.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    )
}
