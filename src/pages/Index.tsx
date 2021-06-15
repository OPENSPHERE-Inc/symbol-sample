import React, {useCallback, useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import assert from "assert";
import {
    announceTx,
    createTransferTx,
    getAccount,
    getAccountBalance,
    searchConfirmedTx,
    signTx,
    waitForConfirmTx
} from "../libs/symbol";
import Long from "long";
import { useToasts } from "react-toast-notifications";
import {TransactionType, TransferTransaction} from "symbol-sdk";
import {TransactionDialog, TransactionDialogData} from "../components/TransactionDialog";


assert(process.env.REACT_APP_RECIPIENT_ADDR);
const recipientAddr = process.env.REACT_APP_RECIPIENT_ADDR;

// XYM → Micro XYM へ変換
const fromXYM = (xym: string) => {
    const [integer, decimal] = xym.split('.');

    return Long.fromString(integer).mul(1000000).add(
        Long.fromString(decimal ? (decimal + '000000').slice(0, 6) : '0')
    );
}

// Micro XYM → XYM へ変換
const toXYM = (microXYM: Long) => {
    const decimal = ('000000' + microXYM.mod(1000000).toString()).slice(-6)
        .replace(/0+$/g, '');
    const integer = microXYM.div(1000000).toString();

    return `${integer}${decimal && '.' + decimal}`;
}

interface FormData {
    amount: string,
    privateKey: string,
    message: string,
}

const Index = () => {
    const form = useForm<FormData>({
        mode: 'onBlur',
        defaultValues: {
            amount: '',
            privateKey: '',
            message: '',
        },
    });
    const { register, formState: { errors, isDirty, isValid, isSubmitting }, handleSubmit, reset, watch } = form;
    const { addToast } = useToasts();
    const [ balance, setBalance ] = useState(Long.ZERO);
    const [ txs, setTxs ] = useState<TransferTransaction[]>();
    const [ txDialog, setTxDialog ] = useState<TransactionDialogData>();
    const amountWatch = watch('amount', '');
    const messageWatch = watch('message', '');

    const updateBalance = useCallback(() => {
        getAccountBalance(recipientAddr)
            .then((balance) => {
                setBalance(balance);
            })
            .catch(console.error);
    }, []);

    const updateTxs = useCallback(() => {
        searchConfirmedTx(recipientAddr, 100, 1)
            .then((txs) => {
                console.log(txs);
                setTxs(txs
                    .filter((tx) => tx.type === TransactionType.TRANSFER)
                    .map((tx) => tx as TransferTransaction)
                );
            })
            .catch(console.error);
    }, []);

    const onSubmit = useCallback(async (values: FormData) => {
        try {
            const tx = await createTransferTx(recipientAddr, fromXYM(values.amount), values.message);
            const signer = await getAccount(values.privateKey);
            const signedTx = await signTx(tx, signer);
            await announceTx(signedTx);

            addToast('トランザクションをアナウンスしました！完了までお待ちください。',
                {appearance: 'info', autoDismiss: true});

            await waitForConfirmTx(signer, signedTx);

            addToast('送金完了しました！',
                {appearance: 'success', autoDismiss: true});
            reset();
            updateBalance();
            updateTxs();
        } catch (e) {
            console.error(e);
            addToast('エラーが発生しました。', {appearance: 'error', autoDismiss: true});
        }
    }, [addToast, updateBalance, reset, updateTxs]);

    const onShowTransaction = useCallback(async () => {
        if (!amountWatch) {
            return;
        }
        try {
            const tx = await createTransferTx(recipientAddr, fromXYM(amountWatch), messageWatch);
            setTxDialog({show: true, tx});
        } catch (e) {
            console.error(e);
            addToast('エラーが発生しました。', {appearance: 'error', autoDismiss: true});
        }
    }, [addToast, amountWatch, messageWatch]);

    useEffect(() => {
        updateBalance();
        updateTxs();
    }, [updateBalance, updateTxs]);

    return <section className="section">
        <div className="container is-max-desktop">
            <div className="content">
                <h3 className="title is-5">寄付合計額</h3>

                <p>
                    { toXYM(balance) } XYM
                </p>

                <h3 className="title is-5">寄付一覧（最新100件）</h3>

                { txs ? <table className="table">
                    <tbody>
                    { txs.map((tx, index) => <tr key={index}>
                        <td>{tx.signer?.address.plain()}</td>
                        <td>{toXYM(Long.fromString(tx.mosaics[0].amount.toString()))} XYM</td>
                        <td>{tx.message.payload}</td>
                    </tr> )}
                    </tbody>
                </table> : <div className="notification is-warning">寄付はまだ1件もありません。</div>}

                <h3 className="title is-5">寄付フォーム</h3>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="field">
                        <label className="label">金額</label>
                        <div className="control has-icons-right">
                            <input className={`input ${errors.amount ? 'is-danger' : ''}`}
                                   type="number"
                                   step="0.000001"
                                   placeholder="金額"
                                   disabled={isSubmitting}
                                   { ...register("amount", {
                                       required: '必須項目です。',
                                   }) }
                            />
                            <span className="icon is-small is-right">{'XYM'}</span>
                        </div>
                    </div>
                    { errors.amount && <div className="field">
                        <p className="help is-danger">
                            { errors.amount.message }
                        </p>
                    </div> }

                    <div className="field">
                        <label className="label">メッセージ</label>
                        <div className="control">
                            <textarea className={`textarea ${errors.message ? 'is-danger' : ''}`}
                                      placeholder="メッセージ"
                                      maxLength={140}
                                      disabled={isSubmitting}
                                      {...register("message", {
                                          maxLength: {
                                              value: 140,
                                              message: "メッセージの長さは最大140文字までです。"
                                          }
                                      })}
                            />
                        </div>
                    </div>
                    { errors.message && <div className="field">
                        <p className="help is-danger">
                            { errors.message.message }
                        </p>
                    </div> }

                    <div className="field">
                        <label className="label">プライベートキー</label>
                        <div className="control">
                            <input className={`input ${errors.privateKey ? 'is-danger' : ''}`}
                                   type="password"
                                   placeholder="プライベートキー"
                                   disabled={isSubmitting}
                                   { ...register("privateKey", {
                                       required: '必須項目です。',
                                   }) }
                            />
                        </div>
                    </div>
                    { errors.privateKey && <div className="field">
                        <p className="help is-danger">
                            { errors.privateKey.message }
                        </p>
                    </div> }

                    <div className="buttons is-centered">
                        <button className="button is-primary"
                                type="submit"
                                disabled={!isDirty || !isValid || isSubmitting}>
                            送金
                        </button>
                        <button className="button is-primary is-outlined"
                                type="button"
                                disabled={!amountWatch || isSubmitting}
                                onClick={onShowTransaction}>
                            トランザクション取得
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <TransactionDialog onClose={() => setTxDialog({show: false})} data={txDialog} />
    </section>
}

export default Index;
