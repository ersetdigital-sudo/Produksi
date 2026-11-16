import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { CURRENT_USER } from "@/features/auth/current-user";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app">
        <Sidebar user={CURRENT_USER} />
        <main className={`main ${styles.main}`}>
          <div className={styles.page}>{children}</div>
        </main>
      </div>
      <MobileTabBar />
    </>
  );
}
