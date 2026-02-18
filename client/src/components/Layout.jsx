import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Calendar, BarChart3, Settings } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-primary text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-surface hover:text-gray-200'
            }`}
    >
        <Icon size={22} />
        <span className="font-medium">{label}</span>
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();

    const navItems = [
        { to: '/', icon: Dumbbell, label: 'Entrenar' },
        { to: '/programs', icon: Calendar, label: 'Programas' },
        { to: '/history', icon: BarChart3, label: 'Historial' },
        // { to: '/settings', icon: Settings, label: 'Ajustes' },
    ];

    return (
        <div className="min-h-screen bg-background text-gray-100 flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-gray-800 p-6 fixed h-full z-10">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="bg-primary p-2 rounded-lg">
                        <Dumbbell className="text-white" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">IronTracker</h1>
                </div>

                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.to}
                            {...item}
                            active={location.pathname === item.to}
                        />
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-gray-800 p-2 flex justify-around z-50 pb-safe">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`flex flex-col items-center p-2 rounded-lg ${isActive ? 'text-primary' : 'text-gray-500'}`}
                        >
                            <Icon size={24} />
                            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}