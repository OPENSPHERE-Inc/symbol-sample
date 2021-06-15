import React, {useCallback, useEffect, useState} from "react";
import {Transaction} from "symbol-sdk";
import {createTxQRCode, createTxUri} from "../libs/symbol";
import {useToasts} from "react-toast-notifications";


export interface TransactionDialogData {
    show: boolean,
    tx?: Transaction,
}

interface Props {
    data?: TransactionDialogData,
    onClose: (data?: TransactionDialogData) => any,
}

export const TransactionDialog: React.FC<Props> = (props) => {
    const [txUri, setTxUri] = useState<string>();
    const [txQRCode, setTxQRCode] = useState<string>();
    const { addToast } = useToasts();

    useEffect(() => {
        if (!props.data?.tx) {
            return;
        }
        createTxUri(props.data.tx).then((uri) => setTxUri(uri));
        createTxQRCode(props.data.tx).then((qr) => setTxQRCode(qr));
    }, [props.data?.tx]);

    const copyTxUri = useCallback(async () => {
        if (!txUri) {
            return;
        }
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(txUri);
            addToast('トランザクションURIをクリップボードにコピーしました',
                { appearance: 'success', autoDismiss: true });
        } else {
            addToast('クリップボードにコピーできませんでした。ブラウザ非対応？',
                { appearance: 'error', autoDismiss: true });
        }
    }, [txUri, addToast]);

    return props.data?.show ? <div className={`modal is-active`}>
        <div className="modal-background"></div>
        <div className="modal-card">
            <header className="modal-card-head">
                <p className="modal-card-title">トランザクション</p>
                <button className="delete" aria-label="close" onClick={() => props.onClose(props.data)}></button>
            </header>
            <section className="modal-card-body">
                <div className="content">
                    <p>
                        以下のいずれかをデスクトップウォレットにインポートしてください。
                    </p>
                    <h3 className="title is-5">
                        URI
                    </h3>
                    <div className="field has-addons">
                        <div className="control is-expanded">
                            <input className="input" readOnly={true} defaultValue={txUri || ''} />
                        </div>
                        <p className="control">
                            <button className="button is-ghost"
                                    type="button"
                                    onClick={copyTxUri}
                                    title="クリップボードにコピー">
                                <span className="icon">
                                    <i className="fas fa-copy"></i>
                                </span>
                            </button>
                        </p>
                    </div>
                    <h3 className="title is-5">
                        QRコード
                    </h3>
                    <div className="block is-flex is-justify-content-center has-background-white">
                        { txQRCode
                            ? <figure className="image is-256x256"><img src={txQRCode} alt="QR code" /></figure>
                            : <span>Loading...</span> }
                    </div>
                </div>
            </section>
            <footer className="modal-card-foot">
                <button className="button"
                        type="button"
                        onClick={() => props.onClose(props.data)}>
                    閉じる
                </button>
            </footer>
        </div>
    </div> : null;
}

