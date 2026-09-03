"use client";
import { LayoutDashboard, Users, ListTodo, Settings2, Calendar, FileText, } from "lucide-react";
import SearchResult from "./SearchResult";
type ResultItem = {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
};
type SearchResultsProps = {
    leads: ResultItem[];
  customers: ResultItem[];
    tasks: ResultItem[];
    pages: ResultItem[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    onClose: () => void;
};
export default function SearchResults({ leads, customers, tasks, pages, selectedIndex, onSelect, onClose, }: SearchResultsProps) {
    let currentIndex = -1;
    const renderGroup = (title: string, items: ResultItem[], icon: any) => {
        if (items.length === 0) {
            return null;
        }
        return (<div className="space-y-2">

        <p className="
            px-2
            text-[11px]
            uppercase
            tracking-[0.25em]
            text-foreground/40
          ">
          {title}
        </p>


        <div className="space-y-1">

          {items.map((item) => {
                currentIndex++;
                const active = currentIndex === selectedIndex;
                const index = currentIndex;
                return (<div key={item.id} onMouseEnter={() => onSelect(index)}>

                <SearchResult title={item.title} subtitle={item.subtitle} href={item.href} icon={icon} active={active} onClick={() => {
                        onClose();
                    }}/>

              </div>);
            })}

        </div>

      </div>);
    };
    return (<div className="
        space-y-5
        max-h-[420px]
        overflow-y-auto
        pr-1
      ">

      {renderGroup("Active Leads", leads, Users)}


      {renderGroup("Customers", customers, Users)}


      {renderGroup("Tasks", tasks, ListTodo)}


      {renderGroup("Pages", pages, FileText)}


      {leads.length === 0 &&
            customers.length === 0 &&
            tasks.length === 0 &&
            pages.length === 0
            ?
                (<div className="
              rounded-xl
              border
              border-border-subtle
              bg-surface-2
              px-4
              py-8
              text-center
              text-sm
              text-foreground/50
            ">
            No results found
          </div>)
            :
                null}

    </div>);
}
