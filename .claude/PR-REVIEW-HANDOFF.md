# PR Review Handoff: feat/address-and-name

## Contexto

PR que refactoriza `@wonderland/interop-addresses` para alinear con ERC-7930 (binary) y ERC-7828 (human-readable).

**Métricas:** 90 archivos, +5392/-2788 líneas

## Estándares de Referencia

-   [ERC-7930: Interoperable Addresses](https://eips.ethereum.org/EIPS/eip-7930) - Formato binario
-   [ERC-7828: Readable Interoperable Addresses](https://eips.ethereum.org/EIPS/eip-7828) - Formato legible con ENS

### Formato ERC-7930 Binary:

```
[Version: 2 bytes][ChainType: 2 bytes][ChainRefLength: 1 byte][ChainRef: N bytes][AddrLength: 1 byte][Address: M bytes]
```

### Formato ERC-7828 Human-Readable:

```
<address>@<chainType>:<chainReference>#<checksum>
Ejemplo: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045@eip155:1#4CA88C9C
```

## Cambio Arquitectónico

**ANTES (monolítico):**

```
utils/
├── buildInteropAddress.ts
├── parseHumanReadable.ts
├── parseBinary.ts
└── ... (todo mezclado)
```

**DESPUÉS (3 capas):**

```
address/     ← ERC-7930 (síncrona, pure functions)
name/        ← ERC-7828 (async para ENS resolution)
providers/   ← API pública high-level
```

## Archivos Críticos a Revisar

### 1. `packages/addresses/src/address/index.ts` (570 líneas)

Core del ERC-7930. Funciones principales:

-   `decodeAddress()` - Parse binary → InteroperableAddress
-   `encodeAddress()` - InteroperableAddress → binary
-   `calculateChecksum()` - keccak256 de los bytes (sin version)
-   `validateChecksum()` - Compara checksums

**Puntos a verificar:**

-   Línea 216-220: Validación defensiva `chainReferenceLength > 32`
-   Línea 227-231: Validación defensiva `addressLength > 255`
-   Línea 499: Checksum excluye version bytes (`hex.slice(6)`)

### 2. `packages/addresses/src/name/index.ts`

Core del ERC-7828. Funciones principales:

-   `parseName()` - String → InteroperableAddress + metadata
-   `formatName()` - InteroperableAddress → String

### 3. `packages/addresses/src/schemas/interoperableAddress.schema.ts`

Zod schemas para validación. Discriminated union binary/text.

**Posibles issues a revisar:**

-   Línea 18-19: `Number(chainReference)` puede dar `NaN` para strings vacíos
-   Línea 50: `bs58.decodeUnsafe` - ¿Maneja bien todos los edge cases de Solana?

### 4. `packages/addresses/src/name/resolveENS.ts`

Resolución ENS con ENSIP-11 multi-chain coinType.

**Posibles issues:**

-   Línea 43-44: `isMainnet` check usa `chainId === 1 || chainReference === "1"` - ¿redundante?
-   Línea 56-64: Fallback a ETHEREUM_COIN_TYPE si no encuentra chain-specific

### 5. `packages/cross-chain/src/providers/AcrossProvider.ts`

Migración de async→sync para `parseInteropAddress` y `generateInteropAddress`.

## Issues Potenciales Identificados

### 1. **Naming inconsistente de archivo**

`src/errors/invalidInteroperableAddress.exception.ts` debería ser PascalCase como los demás.

### 2. **Validación de chainReference para EIP-155**

```typescript
// En interoperableAddress.schema.ts:18-19
case "eip155": {
    const chainId = Number(chainReference);
    return Number.isInteger(chainId) && chainId > 0;
}
```

-   `Number("")` retorna `0`, no `NaN`
-   `Number("1.5")` retorna `1.5`, pasa `> 0` pero falla `isInteger`
-   Debería validar que es un string numérico primero

### 3. **Solana address validation**

```typescript
// En interoperableAddress.schema.ts:48-54
case "solana": {
    try {
        const decoded = bs58.decodeUnsafe(address);
        return decoded !== undefined && decoded.length > 0;
    } catch {
        return false;
    }
}
```

-   `decodeUnsafe` no debería lanzar excepciones (por eso es "unsafe")
-   El `try/catch` es redundante
-   No valida longitud específica de Solana (32 bytes para pubkeys)

### 4. **ENS sin chain reference**

```typescript
// En resolveENS.ts:105-109
if (isENS && !chainReference) {
    throw new InvalidInteroperableName(`ENS names require a specific chain reference...`);
}
```

-   Esto es correcto según ERC-7828, pero ¿debería permitir default a mainnet?

### 5. **Checksum calculation excluye version**

```typescript
// En address/index.ts:499
const hash = keccak256(`0x${hex.slice(6)}`);
```

-   `hex.slice(6)` remueve "0x" (2 chars) + version (4 chars = 2 bytes)
-   Esto es correcto según ERC-7930, pero debería tener un comentario más claro

### 6. **Type narrowing después de validateInteroperableAddress**

```typescript
// En address/index.ts:257, 284, etc.
return validateInteroperableAddress(binaryAddr) as InteroperableAddressBinary;
```

-   El `as` cast es necesario porque Zod no preserva el tipo específico
-   Podría ser más type-safe con overloads en validateInteroperableAddress

### 7. **parseChainReferenceLength se llama múltiples veces**

En `decodeAddress`, se llama a `parseChainReferenceLength` 3 veces (líneas 215, 222 indirectamente, 226 indirectamente). Cada llamada hace slice del array. Debería cachear el valor.

## Tests a Verificar

Los tests están bien estructurados en:

-   `test/address/` - Tests de la capa ERC-7930
-   `test/name/` - Tests de la capa ERC-7828

**Cobertura de edge cases a verificar:**

-   [ ] Chain ID muy grande (> MAX_SAFE_INTEGER)
-   [ ] Solana addresses con caracteres inválidos de base58
-   [ ] ENS names con unicode (normalización UTS-46)
-   [ ] Binary addresses truncados
-   [ ] Checksum con lowercase (debería rechazar)

## Resumen de Veredicto

**Aprobar con comentarios:**

1. Issue de naming del archivo de error (minor)
2. Validación de chainReference para string vacío (medium)
3. Validación de longitud de Solana address (medium)
4. Performance: cachear parseChainReferenceLength (minor)
5. Type safety: evitar `as` casts si es posible (minor)

El PR en general está bien implementado y alineado con los estándares. Los issues son mejoras, no blockers.
