import { Button } from "components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import {MoreVertical, Edit, Trash2, Flag, Ban} from "lucide-react";

interface CommentActionsMenuProps {
    isAuthor: boolean;
    isSuperuser: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReport: () => void;
    isBanned?: boolean;
    banReason?: string | null;
}

export default function CommentActionsMenu({
    isAuthor,
    isSuperuser,
    onEdit,
    onDelete,
    onReport,
    isBanned = false,
    banReason = null,
}: CommentActionsMenuProps) {
    const canEdit = isAuthor && !isBanned;
    const canDelete = isAuthor || isSuperuser;
    const canReport = !isAuthor && !isSuperuser && !isBanned;
    const showBannedEdit = isAuthor && isBanned;
    const showBannedReport = !isAuthor && !isSuperuser && isBanned;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                    <MoreVertical className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {canEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                )}
                {showBannedEdit && (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                        <Ban className="mr-2 h-4 w-4" />
                        Edit (Banned)
                    </DropdownMenuItem>
                )}
                {canDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                )}
                {canReport && (
                    <DropdownMenuItem onClick={onReport} className="text-destructive focus:text-destructive">
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                    </DropdownMenuItem>
                )}
                {showBannedReport && (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                        <Ban className="mr-2 h-4 w-4" />
                        Report (Banned)
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
