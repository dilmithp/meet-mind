import { Users, UserCheck, UserX } from 'lucide-react';

type StatsCardsProps = {
    stats: {
        total: number;
        verified: number;
        unverified: number;
    };
};

export function StatsCards({ stats }: StatsCardsProps) {
    const cards = [
        {
            title: 'Total Users',
            value: stats.total,
            icon: Users,
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
        },
        {
            title: 'Verified Users',
            value: stats.verified,
            icon: UserCheck,
            bgColor: 'bg-green-500/10',
            iconColor: 'text-green-500',
        },
        {
            title: 'Unverified Users',
            value: stats.unverified,
            icon: UserX,
            bgColor: 'bg-yellow-500/10',
            iconColor: 'text-yellow-500',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.title}
                        className="bg-card rounded-lg border p-6 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </p>
                                <p className="text-3xl font-bold mt-2">{card.value}</p>
                            </div>
                            <div className={`${card.bgColor} p-3 rounded-full`}>
                                <Icon className={`h-6 w-6 ${card.iconColor}`} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
