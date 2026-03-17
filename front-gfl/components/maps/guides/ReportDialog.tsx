'use client'

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from 'components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'components/ui/select';
import { Textarea } from 'components/ui/textarea';
import { Button } from 'components/ui/button';
import { Label } from 'components/ui/label';
import { toast } from 'sonner';

interface ReportDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (reason: string, details?: string) => Promise<void>;
    itemType?: 'guide' | 'comment';
}

const reportReasons = [
    { value: 'spam', label: 'Spam or advertising' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'misleading', label: 'Misleading or incorrect information' },
    { value: 'harassment', label: 'Harassment or hate speech' },
    { value: 'other', label: 'Other (please specify)' },
];

export default function ReportDialog({
    open,
    onClose,
    onSubmit,
    itemType = 'guide'
}: ReportDialogProps) {
    const [reason, setReason] = useState<string>('');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Please select a reason for reporting');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(reason, details);
            toast.success('Report submitted successfully', {
                description: 'Thank you for helping keep the community safe.'
            });
            // Reset and close
            setReason('');
            setDetails('');
            onClose();
        } catch (error: any) {
            toast.error('Failed to submit report', {
                description: error.message || 'Please try again later'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setReason('');
            setDetails('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report {itemType === 'guide' ? 'Guide' : 'Comment'}</DialogTitle>
                    <DialogDescription>
                        Help us maintain a positive community by reporting content that violates our guidelines.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="reason">Reason for report</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {reportReasons.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="details">Additional details (optional)</Label>
                        <Textarea
                            id="details"
                            placeholder="Provide any additional context that might help us review this report..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground">
                            {details.length}/500 characters
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !reason}
                    >
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
