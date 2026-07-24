// Cache de dados de referência (listas de seleção em formulários).
// TTL de 5 min: evita requisições redundantes ao trocar de aba.
import {
  listarCategorias, listarFabricantes, listarFornecedores, listarKits, listarItens,
  type CategoriaProduto, type Fabricante, type Fornecedor, type Kit, type ItemCatalogo,
} from "./catalogo";

type Store<T> = { data: T | null; ts: number };

function makeStore<T>(): Store<T> { return { data: null, ts: 0 }; }

const TTL = 5 * 60 * 1000;

function hit<T>(s: Store<T>): T | null {
  return Date.now() - s.ts < TTL ? s.data : null;
}

async function cached<T>(store: Store<T>, loader: () => Promise<T>): Promise<T> {
  const h = hit(store);
  if (h) return h;
  const v = await loader();
  store.data = v; store.ts = Date.now();
  return v;
}

const _cats  = makeStore<CategoriaProduto[]>();
const _fabs  = makeStore<Fabricante[]>();
const _fors  = makeStore<Fornecedor[]>();
const _kits  = makeStore<Kit[]>();
const _itens = makeStore<ItemCatalogo[]>();

export const getCategorias   = () => cached(_cats,  () => listarCategorias({ ativo: true }));
export const getFabricantes  = () => cached(_fabs,  () => listarFabricantes({ ativo: true }));
export const getFornecedores = () => cached(_fors,  () => listarFornecedores({ ativo: true }));
export const getKits         = () => cached(_kits,  () => listarKits({ ativo: true }));
export const getItens        = () => cached(_itens, () => listarItens({ ativo: true }));
