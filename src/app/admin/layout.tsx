import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel - Meet Mind',
    description: 'Admin panel for managing orders and system',
};

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <div className="admin-layout">
            {children}
        </div>
    );
}
