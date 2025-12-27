import { Button } from "components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Flag, Share2 } from "lucide-react";

interface GuideActionsMenuProps {
    isAuthor: boolean;
    isSuperuser: boolean;
    isLoggedIn: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReport: () => void;
    onShare: () => void;
}

export default function GuideActionsMenu({
    isAuthor,
    isSuperuser,
    isLoggedIn,
    onEdit,
    onDelete,
    onReport,
    onShare,
}: GuideActionsMenuProps) {
    const canEdit = isAuthor;
    const canDelete = isAuthor || isSuperuser;
    const canReport = isLoggedIn && !isAuthor;

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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
