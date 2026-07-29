import { AppShellV2 } from "@/components/map-feature/shell/app-shell-v2";

export default function Loading() {
    return (
        <AppShellV2>
            <div className="flex h-full w-full items-center justify-center font-sans p-8">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <div className="text-slate-500 text-sm font-medium">Loading Map Data...</div>
                </div>
            </div>
        </AppShellV2>
    );
}
