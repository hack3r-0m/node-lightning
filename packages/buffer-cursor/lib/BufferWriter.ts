/**
 * Utility class for writing arbitrary data into a Buffer. This class will
 * automatically expand the underlying Buffer and return a trimmed view
 * when complete.
 */
export class BufferWriter {
    private _position: number;
    private _fixedLength: number;
    private _buffer: Buffer;

    /**
     * Constructs a BufferWriter that optionally includes a fixed length. When
     * the fixed length is set, any write that results in expansion beyond the
     * fixed length will throw an error. The fixed length can be used to
     * preallocate a BufferWriter and ensure that the Buffer always returns
     * with the required number of bytes.
     * @param fixedLength
     */
    constructor(fixedLength?: number) {
        this._position = 0;
        this._fixedLength = fixedLength;
        this._buffer = Buffer.alloc(fixedLength || 0);
    }

    /**
     * Gets the current size of the output Buffer
     */
    get size() {
        return this._position;
    }

    /**
     * Returns the Buffer constructed from the written data
     */
    public toBuffer(): Buffer {
        if (this._fixedLength) return this._buffer;
        else return this._buffer.slice(0, this._position);
    }

    /**
     * Write at the current positiion
     * @param val
     */
    public writeUInt8(val: number) {
        this._writeStandard(this.writeUInt8.name, val, 1);
    }

    /**
     * Write at the current positiion
     * @param val
     */
    public writeUInt16LE(val: number) {
        this._writeStandard(this.writeUInt16LE.name, val, 2);
    }

    /**
     * Write at the current positiion
     * @param val
     */
    public writeUInt16BE(val: number) {
        this._writeStandard(this.writeUInt16BE.name, val, 2);
    }

    /**
     * Write at the current positiion
     * @param val
     */
    public writeUInt32LE(val: number) {
        this._writeStandard(this.writeUInt32LE.name, val, 4);
    }

    /**
     * Write at the current positiion
     * @param val
     */
    public writeUInt32BE(val: number) {
        this._writeStandard(this.writeUInt32BE.name, val, 4);
    }

    /**
     * Write at the current positiion
     * @param value
     */
    public writeUInt64LE(value: number | bigint) {
        const val = BigInt(value);
        if (val < 0 || val >= BigInt(2) ** BigInt(64)) {
            throw new RangeError(
                `The value of "value" is out of range. It must be >= 0 and <= 18446744073709551615. Received ${value.toString()}`,
            );
        }
        const buf = Buffer.from(val.toString(16).padStart(16, "0"), "hex");
        this.writeBytes(buf.reverse());
    }

    /**
     * Write at the current positiion
     * @param value
     */
    public writeUInt64BE(value: number | bigint) {
        const val = BigInt(value);
        if (val < 0 || val >= BigInt(2) ** BigInt(64)) {
            throw new RangeError(
                `The value of "value" is out of range. It must be >= 0 and <= 18446744073709551615. Received ${value.toString()}`,
            );
        }
        const buf = Buffer.from(val.toString(16).padStart(16, "0"), "hex");
        this.writeBytes(buf);
    }

    /**
     * Write bytes at the current positiion
     * @param buffer
     */
    public writeBytes(buffer: Buffer) {
        if (!buffer || !buffer.length) return;
        this._expand(buffer.length);
        buffer.copy(this._buffer, this._position);
        this._position += buffer.length;
    }

    /**
     * Reads a variable length unsigned integer in little-endian as specified in
     * the Bitcoin protocol documentation.
     *
     * < 0xfd = 1 byte number
     *   0xfd = 2 byte number (3 bytes total)
     *   0xfe = 4 byte number (5 bytes total)
     *   0xff = 8 byte number (9 bytes total)
     */
    public writeVarInt(num: bigint) {
        if (num < BigInt(0xfd)) {
            this.writeUInt8(Number(num));
        } else if (num < BigInt(0x10000)) {
            this.writeUInt8(0xfd);
            this.writeUInt16LE(Number(num));
        } else if (num < BigInt(0x100000000)) {
            this.writeUInt8(0xfe);
            this.writeUInt32LE(Number(num));
        } else {
            this.writeUInt8(0xff);
            this.writeUInt64LE(num);
        }
    }

    /**
     * Reads a variable length unsigned integer as specified in the Lightning Network
     * protocol documentation and always returns a BigInt to maintain a consistent
     * call signature.
     *
     * @remarks
     * Specified in:
     * https://github.com/lightningnetwork/lightning-rfc/blob/master/01-messaging.md#appendix-a-bigsize-test-vectors
     *
     * < 0xfd = 1 byte number
     *   0xfd = 2 byte number (3 bytes total)
     *   0xfe = 4 byte number (5 bytes total)
     *   0xff = 8 byte number (9 bytes total)
     */
    public writeBigSize(num: bigint) {
        if (num < BigInt(0xfd)) {
            this.writeUInt8(Number(num));
        } else if (num < BigInt(0x10000)) {
            this.writeUInt8(0xfd);
            this.writeUInt16BE(Number(num));
        } else if (num < BigInt(0x100000000)) {
            this.writeUInt8(0xfe);
            this.writeUInt32BE(Number(num));
        } else {
            this.writeUInt8(0xff);
            this.writeUInt64BE(num);
        }
    }

    /**
     * Expands the underlying buffer as needed by doubling the size of the
     * Buffer when it needs to grow.
     * @param needed
     */
    private _expand(needed: number) {
        const required = this._position + needed;

        // Ensure that the BufferWriter with a fixed length is not violated
        if (this._fixedLength && required > this._fixedLength) {
            throw new RangeError(
                `Fixed length Buffer(${this._fixedLength}) exceeded with ${required} bytes`,
            );
        }

        // expand the buffer if the current buffer is insufficiently lengthed
        if (this._buffer.length < required) {
            // calculate the new length based on the required length and some
            // maths where we determine the number of bytes required and at the
            // next power of 2.
            const newLen = 1 << Math.ceil(Math.log2(required));
            const newBuf = Buffer.alloc(newLen);

            // copy the old data to the new buffer and then dispose of the old
            // buffer
            this._buffer.copy(newBuf);
            this._buffer = newBuf;
        }
    }

    /**
     * Helper for writing to the buffer using built-in write
     * functions
     * @param fn name of function
     * @param val number to write
     * @param len length of number in bytes
     */
    private _writeStandard(fn: string, val: number, len: number) {
        this._expand(len);
        this._buffer[fn](val, this._position);
        this._position += len;
    }
}
