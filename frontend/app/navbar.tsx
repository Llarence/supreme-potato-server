import styles from '@/styles/styles.module.css'

export default function Navbar(): React.ReactElement {
    return (
        <div className={styles.sidenav}>
            <a href='/match'>Match</a>
        </div>
    )
}
