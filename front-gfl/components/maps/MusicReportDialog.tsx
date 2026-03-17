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
import { Input } from 'components/ui/input';
import { Button } from 'components/ui/button';
import { Label } from 'components/ui/label';
import { toast } from 'sonner';

interface MusicReportDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (reason: string, details?: string, youtubeUrl?: string) => Promise<void>;
    musicTitle: string;
    currentYoutubeId?: string | null;
}

const reportReasons = [
    { value: 'video_unavailable', label: 'Video not available/removed' },
    { value: 'wrong_video', label: 'Wrong video/music' },
];

export default function MusicReportDialog({
    open,
    onClose,
    onSubmit,
    musicTitle,
    currentYoutubeId
}: MusicReportDialogProps) {
    const [reason, setReason] = useState<string>('');
    const [details, setDetails] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Please select a reason for reporting');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(reason, details || undefined, youtubeUrl || undefined);
            toast.success('Report submitted successfully', {
                description: 'Thank you for helping us maintain accurate music information.'
            });
            // Reset and close
            setReason('');
            setDetails('');
            setYoutubeUrl('');
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
            setYoutubeUrl('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report Music Issue</DialogTitle>
                    <DialogDescription>
                        Report an issue with the YouTube video for "{musicTitle}"
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {currentYoutubeId && (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <span className="font-medium">Current video ID:</span> {currentYoutubeId}
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="reason">Issue type</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger id="reason">
                                <SelectValue placeholder="Select an issue type" />
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
                        <Label htmlFor="youtube-url">Suggested YouTube URL (optional)</Label>
                        <Input
                            id="youtube-url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            If you know the correct video, paste the URL here
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="details">Additional details (optional)</Label>
                        <Textarea
                            id="details"
                            placeholder="Provide any additional context..."
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
