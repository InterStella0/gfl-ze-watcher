import { Button } from "components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Flag, Share2, Ban } from "lucide-react";

interface GuideActionsMenuProps {
    isAuthor: boolean;
    isSuperuser: boolean;
    isLoggedIn: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReport: () => void;
    onShare: () => void;
    isBanned?: boolean;
    banReason?: string | null;
}

export default function GuideActionsMenu({
    isAuthor,
    isSuperuser,
    isLoggedIn,
    onEdit,
    onDelete,
    onReport,
    onShare,
    isBanned = false,
    banReason = null,
}: GuideActionsMenuProps) {
    const canEdit = isAuthor && !isBanned;
    const canDelete = isAuthor || isSuperuser;
    const canReport = isLoggedIn && !isAuthor && !isBanned;
    const showBannedEdit = isAuthor && isBanned;
    const showBannedReport = isLoggedIn && !isAuthor && isBanned;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
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
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onReport}>
                            <Flag className="mr-2 h-4 w-4" />
                            Report
                        </DropdownMenuItem>
                    </>
                )}
                {showBannedReport && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="text-muted-foreground">
                            <Ban className="mr-2 h-4 w-4" />
                            Report (Banned)
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
