// [PATCH] Update status tiket
router.patch('/:id/set-status', authMiddleware, async (req, res) => {
    try {
        let { status } = req.body;
        if (!status) return res.status(400).json({ message: 'Status tidak boleh kosong.' });

        // Mapping status bahasa Indonesia ke status internal
        const STATUS_MAP = {
            'diproses': 'diproses',
            'on hold': 'on hold',
            'menunggu approval': 'waiting third party',
            'waiting third party': 'waiting third party',
            'done': 'done'
        };

        const internalStatus = STATUS_MAP[status.toLowerCase()];
        if (!internalStatus) {
            return res.status(400).json({ message: 'Status tidak valid.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

        if (ticket.status.toLowerCase() === 'done') {
            return res.status(400).json({ message: 'Tiket sudah selesai, status tidak bisa diubah lagi.' });
        }

        ticket.status = internalStatus;
        ticket.completedAt = internalStatus === 'done' ? new Date() : null;
        await ticket.save();

        // Mapping untuk UI
        const mapStatusForUI = (status) => {
            if (!status) return "Diproses";
            const lower = status.toLowerCase();
            if (lower === 'waiting third party') return 'Menunggu Approval';
            if (lower === 'done') return 'Done';
            return status.charAt(0).toUpperCase() + status.slice(1);
        };
        const displayStatus = mapStatusForUI(ticket.status);

        // Kirim notifikasi Telegram
        const statusUpdateMessage = `ℹ️ Status tiket *${escapeMarkdownV2(ticket.ticketCode)}* diubah menjadi *${escapeMarkdownV2(displayStatus)}*\\.`;
        try {
            await bot.sendMessage(ticket.chatId, statusUpdateMessage, { parse_mode: "MarkdownV2", reply_to_message_id: ticket.messageId });
        } catch (err) {
            console.error(`❌ Gagal kirim notifikasi status ke chatId ${ticket.chatId}:`, err.message);
        }

        res.json({ ...ticket._doc, displayStatus });

    } catch (err) {
        console.error("❌ Gagal PATCH /set-status:", err);
        res.status(500).json({ message: 'Gagal mengubah status tiket.' });
    }
});
