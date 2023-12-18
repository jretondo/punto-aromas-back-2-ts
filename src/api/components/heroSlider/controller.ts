import { IHeroSlider } from 'interfaces/Itables';
import { ESelectFunct } from '../../../enums/EfunctMysql';
import { Tables } from '../../../enums/EtablesDB';
import StoreType from '../../../store/mysql';
import OptimizeImg from '../../../utils/optimeImg';
import fs from 'fs';
import path from 'path';
import { staticFolders } from '../../../enums/EStaticFiles';

export = (injectedStore: typeof StoreType) => {
    let store = injectedStore;

    const list = async (page: number) => {
        const data = await store.list(Tables.HERO_SLIDER, [ESelectFunct.all]);
        return {
            data
        };
    }

    const upsert = async (body: IHeroSlider) => {
        const heroSlider: IHeroSlider = {
            id: body.id,
            title: body.title,
            subtitle: body.subtitle,
            image: body.filesName ? body.filesName[0]?.path : "",
            url: body.url,
            active: true,
            type: body.type
        }
        body.filesName && OptimizeImg(body.filesName[0]?.path, "heroSlider")
        if (body.id) {
            return await store.update(Tables.HERO_SLIDER, heroSlider, body.id);
        } else {
            return await store.insert(Tables.HERO_SLIDER, heroSlider);
        }
    }

    const toggleEnabled = async (id: number, enabled: number) => {
        return await store.update(Tables.HERO_SLIDER, { active: enabled }, id);
    }

    const remove = async (idHero: number) => {
        const heroSlider = await store.get(Tables.HERO_SLIDER, idHero);
        fs.unlinkSync(path.join(staticFolders.heroSlider, heroSlider[0].image));
        return await store.remove(Tables.HERO_SLIDER, { id: idHero });
    }

    const get = async (idHero: number) => {
        return await store.get(Tables.HERO_SLIDER, idHero);
    }

    return {
        list,
        upsert,
        remove,
        get,
        toggleEnabled
    }
}
