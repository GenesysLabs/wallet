import { writable, get } from 'svelte/store';

import * as validators from 'types-validate-assert'
const { validateTypes } = validators; 
import { networkKey } from './stores.js';
import { isNetworkObj } from '../objectValidations';

const createCacheStore = () => {
    let initialized = false;

    function getStore(){
        //Set the Coinstore to the value of the local storage
        chrome.storage.local.get({"ideCache": {}}, function(getValue) {
            initialized = true;
            CacheStore.set(getValue.ideCache)
        });
    }

    //Create Intial Store
    const CacheStore = writable({});

    //This is called everytime the CoinStore updated
    CacheStore.subscribe(current => {
        //Only accept an object that can be determined to be a networks storage object
        // if store has already been initialized
        if (validateTypes.isObject(current)) {
            if (initialized) chrome.storage.local.set({"ideCache": current});
        }else{
            //If non-object found then set the store back to the previous local store value
            getStore()
            console.log('Recovered from bad Cache Store Value')
        }
    });

    //Set the NetworksStore to the value of the local storage
    getStore()


    let subscribe = CacheStore.subscribe;
    let update = CacheStore.update;
    let set = CacheStore.set;

    return {
        subscribe,
        set,
        update,
        //Stores a network/contract pair so that we don't call the API again to check it
        addContract: (contractName, networkObj) => {
            //Reject missing or undefined arguments
            if (!validateTypes.isStringWithValue(contractName)) return;
            if (!validateTypes.isSpecificClass(networkObj, "Network")) return;

            let netKey = networkObj.url
            console.log(contractName)
            CacheStore.update(cacheStore => {
                //Store network / contract pair under the contracts key in the cash
                if (!cacheStore['contracts']) cacheStore['contracts'] = {};
                if (!cacheStore['contracts'][netKey]) cacheStore['contracts'][netKey] = {};
                cacheStore['contracts'][netKey][contractName] = true;
                console.log(cacheStore)
                return cacheStore;
            })
        },
        //Check if we have already called the API to check this contract name
        contractExists: (contractName, networkObj) => {
            //Reject missing or undefined arguments
            if (!validateTypes.isStringWithValue(contractName)) return;
            if (!validateTypes.isSpecificClass(networkObj, "Network")) return;

            let netKey = networkObj.url

            //Reject missing or undefined arguments

            let cacheStore = get(CacheStore);
            console.log(cacheStore)
            if (!cacheStore['contracts']) return false;
            if (!cacheStore['contracts'][netKey]) return false;
            if (!cacheStore['contracts'][netKey][contractName]) return false;
            return true;
        },
        //Remove all contracts under a network so that the API will cheeck them again
        refreshNetwork: (networkObj) => {
            //Reject missing or undefined arguments
            if (!validateTypes.isSpecificClass(networkObj, "Network")) return;

            let netKey = networkObj.url
            
            //Clear all contracts under the supplied network
            CacheStore.update(cacheStore => {
                if (!cacheStore['contracts']) return;
                cacheStore['contracts'][netKey] = {};
                return cacheStore;
            })
        }
    };
}

//Create Cache Stores
export const CacheStore = createCacheStore();