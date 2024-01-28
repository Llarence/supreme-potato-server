import styles from '@/styles/styles.module.css'

import Navbar from '@/app/navbar'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Supreme Potato'
}

export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
        <>
            <Navbar />
            <main className={styles.main}>{children}</main>
        </>
    )
}