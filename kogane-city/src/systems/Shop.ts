import * as Phaser from 'phaser';
import { SHOP } from '../data/shop';
import { WEAPONS, WEAPON_SLOTS } from '../data/weapons';
import { PLAYER } from '../data/player';
import type { WorldScene } from '../scenes/WorldScene';

export interface ShopItem { label: string; price: number; note: string; owned: boolean; buy: () => void }

/**
 * Hachiman Hardware. Walk up to a shop door on foot and the menu opens: arrow keys move,
 * Enter buys, walking away closes it. Stock grows as the story advances.
 */
export class Shop {
  /** Where the shops are, for the world's rings and the minimap. */
  places: { x: number; y: number }[] = [];
  open = false;
  items: ShopItem[] = [];
  cursor = 0;

  constructor(private world: WorldScene) {
    this.places = SHOP.places.map((id) => world.map.places[id]).filter(Boolean).map((p) => ({ x: p.x, y: p.y }));
  }

  private stock(): ShopItem[] {
    const w = this.world, p = w.player, out: ShopItem[] = [];
    for (const cls of WEAPON_SLOTS) for (const d of Object.values(WEAPONS)) {
      if (d.weaponClass !== cls || !d.price || (d.unlock ?? 0) > w.story.index) continue;
      const owned = p.weapons.some((x) => x.def.id === d.id);
      out.push({ label: d.name, price: d.price, note: d.desc, owned, buy: () => p.giveWeapon(d.id) });
    }
    const gun = p.weapon.def;
    if (gun.mag > 0) out.push({ label: `Ammo: ${gun.name}`, price: SHOP.ammoPrice, note: `${SHOP.ammoMags} magazines`, owned: false, buy: () => { p.weapon.reserve += gun.mag * SHOP.ammoMags; } });
    out.push({ label: 'Armour', price: SHOP.armourPrice, note: 'Body armour, back to full', owned: p.armour >= PLAYER.maxArmour, buy: () => { p.armour = PLAYER.maxArmour; } });
    return out;
  }

  update(): void {
    const w = this.world, p = w.player, k = w.keys;
    const near = !p.car && w.mode === 'play' && this.places.some((s) => Math.hypot(s.x - p.actor.x, s.y - p.actor.y) < 30);
    if (!near) { this.open = false; return; }
    if (!this.open) { this.open = true; this.cursor = 0; }
    this.items = this.stock();
    const down = (key: Phaser.Input.Keyboard.Key) => Phaser.Input.Keyboard.JustDown(key);
    if (down(k.DOWN)) this.cursor = (this.cursor + 1) % this.items.length;
    if (down(k.UP)) this.cursor = (this.cursor + this.items.length - 1) % this.items.length;
    this.cursor = Math.min(this.cursor, this.items.length - 1);
    const it = this.items[this.cursor];
    if (down(k.ENTER) && it && !it.owned && p.cash >= it.price) { p.cash -= it.price; it.buy(); w.saveGame?.(); }
  }
}
