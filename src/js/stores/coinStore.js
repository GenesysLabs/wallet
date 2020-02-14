import { writable, get, derived } from 'svelte/store';
import { copyItem, isCoinInfoObj, isNumber, isArray } from './stores.js';

export const createCoinStore = () => {
    let initialized = false;

    function getStore(){
        //Set the Coinstore to the value of the local storage
        chrome.storage.local.get({"coins": []}, function(getValue) {
            initialized = true;
            CoinStore.set(getValue.coins)
        });
    }

    //Create Intial Store
    const CoinStore = writable([]);

    //This is called everytime the CoinStore updated
    CoinStore.subscribe(current => {
        //Only accept and Array Object to be saved to the storage and only
        //if store has already been initialized
        if (isArray(current)) {
            if (initialized) chrome.storage.local.set({"coins": current});
        }else{
            //If non-object found then set the store back to the previous local store value
            getStore()
            console.log('Recovered from bad Coin Store Value')
        }
    });

    //Set the Coinstore to the value of the local storage
    getStore()

    let subscribe = CoinStore.subscribe;
    let update = CoinStore.update;
    let set = CoinStore.set;

    return {
        subscribe,
        set,
        update,
        getValue: () => {
            return get(CoinStore)
        },
        //Add a coin to the internal coin storage
        addCoin: (coinInfo) => {
            //Reject missing or undefined arguments
            if (!isCoinInfoObj(coinInfo)) return {added: false, reason: 'badArg'};

            //Set the coin to watch only if no private key supplied
            if (!coinInfo.sk) coinInfo.sk = 'watchOnly'
            
            coinInfo = copyItem(coinInfo);
            //Check if the coin already exists in coinstore
            let coinFound = get(CoinStore).find( f => {
                return f.network === coinInfo.network && f.symbol === coinInfo.symbol && f.vk === coinInfo.vk;
            });
            if (!coinFound){
                //If the coin doesn't exists then push it to the array
                CoinStore.update(coinstore => {
                    coinstore.push(coinInfo)
                    return coinstore;
                })
                return {added: true, reason: 'new'}
            } else {
                //Check if we need to update the sk of a previously added "watch only" coin
                if (coinFound.sk === "watchOnly" && coinInfo.sk !== "watchOnly"){
                    CoinStore.update(coinstore => {
                        coinstore.map( coin => {
                            if(coin.network === coinInfo.network && coin.symbol === coinInfo.symbol && coin.vk === coinInfo.vk){
                                coin.sk = coinInfo.sk;
                            }
                        });
                        return coinstore;
                    })
                    return {added: true, reason: `${coinFound.nickname}'s Private Key Updated`}
                } else {
                    //Reject adding a dupliate Coin
                    return {added: false, reason: 'duplicate'}
                }
            }
        },
        //Retrive a specific coin from the Coin Store
        getCoin: (coinInfo) => {
            //Reject missing or undefined arguments
            if (!isCoinInfoObj(coinInfo)) return;

            //Return the matching coin (will be undefined if not matched)
            return get(CoinStore).find( f => {
                return  f.network === coinInfo.network && f.symbol === coinInfo.symbol && f.vk === coinInfo.vk;
            });
        },
        //Update the balance of a coin
        updateBalance: (coinInfo, balance) => {
            //Reject missing or undefined arguments
            if (!isCoinInfoObj(coinInfo) || !isNumber(balance)) return;
            
            CoinStore.update(coinstore => {
                //Find the coin to update in the store
                let coinToUpdate = coinstore.find( f => {
                    return  f.network === coinInfo.network && f.symbol === coinInfo.symbol && f.vk === coinInfo.vk;
                });
                
                //If the coin was matched then update the balance to the one provided
                if (coinToUpdate){
                    coinToUpdate.balance = balance;
                };
                return coinstore;
            })
        }
    };
}
//Create CoinStore instance
export const CoinStore = createCoinStore();

export const lockedStorage = writable(false);
export const password = writable('Testing0!2');

//Create a derived store to total all wallets
export const balanceTotal = derived(CoinStore, ($CoinStore) => {
    let total = 0;
    $CoinStore.map(coin => {
        if (!coin.balance) return
        total  = total + coin.balance;
    })
    return total;
});