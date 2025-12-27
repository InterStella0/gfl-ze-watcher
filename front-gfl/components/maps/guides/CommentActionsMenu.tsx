import { Button } from "components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";

interface CommentActionsMenuProps {
    isAuthor: boolean;
    isSuperuser: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export default function CommentActionsMenu({
    isAuthor,
    isSuperuser,
    onEdit,
    onDelete,
}: CommentActionsMenuProps) {
    const canEdit = isAuthor;
    const canDelete = isAuthor || isSuperuser;

    // Don't render if user has no permissions
    if (!canEdit && !canDelete) {
        return null;
    }

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
                {canDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
