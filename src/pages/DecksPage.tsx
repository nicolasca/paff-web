import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SiteHeader } from "../components/SiteHeader";
import { UnitCard } from "../features/catalogue/UnitCard";
import type { PublicCard, PublicFaction } from "../features/catalogue/types";
import { DeckSummary } from "../features/decks/DeckSummary";
import {
  formatNumber,
  getDeckStats,
  type Deck,
} from "../features/decks/deckStats";
import { QuantityControl } from "../features/decks/QuantityControl";
import "./DecksPage.css";

type DeckMode = "list" | "view" | "edit";

export function DecksPage({ mode = "list" }: { mode?: DeckMode }) {
  const decks = useQuery(api.decks.listMine);
  const factions = useQuery(
    api.catalogue.listFactions,
    mode !== "view" ? {} : "skip",
  );
  const { deckId } = useParams();
  const navigate = useNavigate();
  const selectedDeck = decks?.find((deck) => deck.id === deckId);
  const [factionId, setFactionId] = useState("");
  const activeFactionId =
    selectedDeck?.faction?.stableId ??
    (factions?.some((faction) => faction.stableId === factionId)
      ? factionId
      : (factions?.[0]?.stableId ?? ""));
  const cards = useQuery(
    api.catalogue.listCards,
    mode === "edit" && activeFactionId
      ? { factionStableId: activeFactionId }
      : "skip",
  );

  return (
    <>
      <SiteHeader />
      <main className="decks-page">
        {mode === "list" ? (
          <DeckLibrary
            decks={decks}
            factions={factions}
            onCreated={(id) => navigate(`/decks/${id}/edit`)}
          />
        ) : decks === undefined ? (
          <div className="deck-state" role="status">
            Chargement du deck…
          </div>
        ) : !selectedDeck ? (
          <div className="deck-state">
            <h1>Deck introuvable</h1>
            <p>
              Ce deck a été supprimé ou n’est pas accessible avec ce compte.
            </p>
            <Link className="ui-button" to="/decks">
              Retour à mes decks
            </Link>
          </div>
        ) : (
          <DeckWorkspace
            key={`${selectedDeck.id}-${mode}`}
            deck={selectedDeck}
            mode={mode}
            factions={factions}
            cards={cards}
            selectedFactionId={activeFactionId}
            onSelectFaction={setFactionId}
            onDeleted={() => navigate("/decks", { replace: true })}
          />
        )}
      </main>
    </>
  );
}

export function DeckLibrary({
  decks,
  factions,
  onCreated,
}: {
  decks: Deck[] | undefined;
  factions: PublicFaction[] | undefined;
  onCreated: (id: Id<"decks">) => void;
}) {
  const createDeck = useMutation(api.decks.create);
  const [creating, setCreating] = useState(false);
  const [factionId, setFactionId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Deck | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !factionId || busy) return;
    setBusy(true);
    setError("");
    try {
      const id = await createDeck({
        name: name.trim(),
        factionStableId: factionId,
      });
      onCreated(id);
      setCreating(false);
      setName("");
    } catch {
      setError(
        "Impossible de créer le deck. Réessayez, votre nom est conservé.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="decks-container">
      <header className="decks-page__intro">
        <div>
          <p className="eyebrow">Votre arsenal</p>
          <h1>Mes decks</h1>
          <p>Composez vos armées. Préparez votre prochaine bataille.</p>
        </div>
        <button
          className="ui-button ui-button--primary"
          onClick={() => setCreating(true)}
          type="button"
        >
          <span aria-hidden="true">+</span> Nouveau deck
        </button>
      </header>
      {creating && (
        <form className="deck-create" onSubmit={handleCreate}>
          <div>
            <label htmlFor="new-deck-name">Nom du deck</label>
            <input
              id="new-deck-name"
              autoFocus
              maxLength={60}
              required
              placeholder="Ex. Les mangeurs de pommes"
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
            <p>
              Commencez avec un deck vide, puis ajoutez les cartes de cette
              faction.
            </p>
          </div>
          <div className="deck-create__faction">
            <label htmlFor="new-deck-faction">Faction du deck</label>
            <select
              id="new-deck-faction"
              value={factionId}
              required
              disabled={busy || !factions?.length}
              onChange={(event) => setFactionId(event.target.value)}
            >
              <option value="">
                {factions === undefined
                  ? "Chargement…"
                  : factions.length
                    ? "Choisir une faction"
                    : "Aucune faction disponible"}
              </option>
              {factions?.map((faction) => (
                <option key={faction.stableId} value={faction.stableId}>
                  {faction.name}
                </option>
              ))}
            </select>
          </div>
          <div className="deck-actions">
            <button
              className="ui-button ui-button--quiet"
              type="button"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setError("");
              }}
            >
              Annuler
            </button>
            <button
              className="ui-button ui-button--primary"
              type="submit"
              disabled={
                busy ||
                !name.trim() ||
                !factions?.some((faction) => faction.stableId === factionId)
              }
            >
              {busy ? "Création…" : "Créer le deck"}
            </button>
          </div>
          {error && (
            <p className="deck-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {decks === undefined ? (
        <div className="deck-state" role="status">
          Chargement des decks…
        </div>
      ) : decks.length === 0 ? (
        <div className="deck-state deck-state--empty">
          <span className="deck-state__mark" aria-hidden="true">
            ✦
          </span>
          <h2>Votre prochaine stratégie commence ici.</h2>
          <p>
            Aucun deck pour le moment. Choisissez un nom et une faction pour
            créer le premier.
          </p>
          {!creating && (
            <button className="ui-button" onClick={() => setCreating(true)}>
              Créer mon premier deck
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="deck-library-heading">
            <h2>Votre collection</h2>
            <span>
              {decks.length} {decks.length > 1 ? "decks" : "deck"}
            </span>
          </div>
          <section className="deck-library" aria-label="Mes decks">
            {decks.map((deck) => {
              const stats = getDeckStats(deck.cards);
              return (
                <article className="deck-tile" key={deck.id}>
                  <Link
                    className="deck-tile__cover"
                    to={`/decks/${deck.id}`}
                    aria-label={`Visualiser ${deck.name}`}
                  >
                    {deck.cards.length ? (
                      deck.cards
                        .slice(0, 3)
                        .map((card) => (
                          <img
                            key={card.stableId}
                            src={card.imagePath}
                            alt=""
                            loading="lazy"
                          />
                        ))
                    ) : (
                      <span>
                        ✦<small>Deck vide</small>
                      </span>
                    )}
                    <span className="deck-tile__count">
                      {formatNumber(stats.total)} cartes
                    </span>
                  </Link>
                  <div className="deck-tile__body">
                    <p className="deck-tile__factions">
                      {deck.faction?.name ?? "Faction à choisir"}
                    </p>
                    <h2>
                      <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
                    </h2>
                    <div className="deck-tile__stats">
                      <span>{stats.unique} cartes différentes</span>
                      <span>
                        Coût {formatNumber(stats.totalCost)}
                        {stats.unknownCostCount ? " + ?" : ""}
                      </span>
                    </div>
                    <p className="deck-tile__date">
                      Modifié le{" "}
                      {new Date(deck.updatedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <div className="deck-tile__actions">
                      <Link
                        className="ui-button"
                        to={`/decks/${deck.id}/edit`}
                        aria-label={`Éditer ${deck.name}`}
                      >
                        Éditer <span aria-hidden="true">↗</span>
                      </Link>
                      <Link
                        className="ui-button ui-button--quiet"
                        to={`/decks/${deck.id}`}
                        aria-label={`Voir ${deck.name}`}
                      >
                        Voir
                      </Link>
                      <button
                        className="ui-button ui-button--quiet ui-button--danger"
                        type="button"
                        onClick={() => setDeleting(deck)}
                        aria-label={`Supprimer ${deck.name}`}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
      {deleting && (
        <DeleteDeckDialog
          deck={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export function DeckWorkspace({
  deck,
  mode,
  factions,
  cards,
  selectedFactionId,
  onSelectFaction,
  onDeleted,
}: {
  deck: Deck;
  mode: "view" | "edit";
  factions: PublicFaction[] | undefined;
  cards: PublicCard[] | undefined;
  selectedFactionId: string;
  onSelectFaction: (id: string) => void;
  onDeleted: () => void;
}) {
  const renameDeck = useMutation(api.decks.rename);
  const setCardQuantity = useMutation(api.decks.setCardQuantity);
  const adjustCardQuantity = useMutation(api.decks.adjustCardQuantity);
  const [name, setName] = useState(deck.name);
  const [renaming, setRenaming] = useState(false);
  const [busyCards, setBusyCards] = useState(new Set<string>());
  const pendingCards = useRef(new Set<string>());
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const editing = mode === "edit";
  const hasMixedFactions = deck.cards.some(
    (card) =>
      card.faction.stableId !==
      (deck.faction?.stableId ?? deck.cards[0]?.faction.stableId),
  );
  const availableCards = cards?.filter(
    (card) => !deck.faction || card.faction.stableId === deck.faction.stableId,
  );
  const quantities = new Map(
    deck.cards.map((card) => [card.stableId, card.quantity]),
  );

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || renaming) return;
    setRenaming(true);
    setError("");
    setSaved(false);
    try {
      await renameDeck({ deckId: deck.id, name });
      setName(name.trim().replace(/\s+/g, " "));
      setSaved(true);
    } catch {
      setError("Le nom n’a pas été enregistré. Réessayez.");
    } finally {
      setRenaming(false);
    }
  }

  async function changeQuantity(
    stableId: string,
    value: { delta: -1 | 1 } | { quantity: number },
  ) {
    if (pendingCards.current.has(stableId)) return;
    pendingCards.current.add(stableId);
    setBusyCards(new Set(pendingCards.current));
    setError("");
    setSaved(false);
    try {
      if ("delta" in value) {
        await adjustCardQuantity({
          deckId: deck.id,
          cardStableId: stableId,
          delta: value.delta,
        });
      } else {
        await setCardQuantity({
          deckId: deck.id,
          cardStableId: stableId,
          quantity: value.quantity,
        });
      }
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof ConvexError &&
          cause.data?.code === "DECK_FACTION_MISMATCH"
          ? "Un deck ne peut contenir qu’une seule faction. Retirez les cartes des autres factions."
          : "La modification des cartes n’a pas été enregistrée. Réessayez.",
      );
    } finally {
      pendingCards.current.delete(stableId);
      setBusyCards(new Set(pendingCards.current));
    }
  }

  return (
    <div className="decks-container">
      <Link className="deck-breadcrumb" to="/decks">
        ← Mes decks
      </Link>
      <header className="deck-workspace-heading">
        <div>
          <p className="eyebrow">
            {editing ? "Atelier de création" : "Votre deck"}
          </p>
          {editing ? (
            <form className="deck-name-form" onSubmit={handleRename}>
              <h1 className="visually-hidden">Éditer {deck.name}</h1>
              <label htmlFor="edit-deck-name">Nom du deck</label>
              <div>
                <input
                  id="edit-deck-name"
                  value={name}
                  maxLength={60}
                  required
                  disabled={renaming}
                  onChange={(event) => setName(event.target.value)}
                />
                <button
                  className="ui-button"
                  disabled={
                    renaming || !name.trim() || name.trim() === deck.name
                  }
                >
                  {renaming ? "Enregistrement…" : "Enregistrer le nom"}
                </button>
              </div>
            </form>
          ) : (
            <h1>{deck.name}</h1>
          )}
        </div>
        <div className="deck-actions">
          <Link
            className={`ui-button${editing ? "" : " ui-button--primary"}`}
            to={`/decks/${deck.id}${editing ? "" : "/edit"}`}
          >
            {editing ? "Visualiser le deck" : "Éditer le deck"}
          </Link>
          <button
            className="ui-button ui-button--quiet ui-button--danger"
            type="button"
            onClick={() => setDeleting(true)}
          >
            Supprimer
          </button>
        </div>
      </header>
      {error && (
        <p className="deck-error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <div className="deck-save-status" role="status">
          <span className={error ? "has-error" : ""} />
          {busyCards.size > 0 || renaming
            ? "Enregistrement…"
            : error
              ? "Modification non enregistrée"
              : saved
                ? "Modifications enregistrées"
                : "Les cartes sont enregistrées automatiquement"}
          <span className="deck-save-status__hint">
            {deck.faction?.name ?? "Une seule faction"} · Copies libres
          </span>
        </div>
      )}
      {hasMixedFactions && (
        <p className="deck-error" role="alert">
          Ce deck contient plusieurs factions. Retirez les cartes des autres
          factions depuis le récapitulatif pour continuer à le construire.
        </p>
      )}
      {deck.cards.some((card) => card.available === false) && <div className="deck-error" role="alert">
        <p>Le catalogue a évolué. Remplacez les cartes retirées avant de choisir ce deck pour une nouvelle partie :</p>
        {deck.cards.filter((card) => card.available === false).map((card) => <p key={card.stableId}>{card.name} ×{card.quantity}{editing && <button type="button" className="ui-button ui-button--quiet" disabled={busyCards.has(card.stableId)} onClick={() => void changeQuantity(card.stableId, { quantity: 0 })}>Retirer {card.name}</button>}</p>)}
      </div>}
      <div className="deck-workspace">
        <section
          className="deck-editor"
          aria-label={editing ? "Ajouter des cartes" : "Contenu du deck"}
        >
          {editing ? (
            <>
              <div className="deck-catalogue-heading">
                <h2>Ajouter des cartes</h2>
                <span>{availableCards?.length ?? "…"} disponibles</span>
              </div>
              <div className="deck-faction-picker">
                <label htmlFor="deck-faction">Faction du deck</label>
                <select
                  id="deck-faction"
                  value={selectedFactionId}
                  disabled={Boolean(deck.faction) || !factions?.length}
                  onChange={(event) => onSelectFaction(event.target.value)}
                >
                  {!factions?.length && (
                    <option value="">
                      {factions ? "Aucune faction" : "Chargement…"}
                    </option>
                  )}
                  {deck.faction ? (
                    <option value={deck.faction.stableId}>
                      {deck.faction.name}
                    </option>
                  ) : (
                    factions?.map((faction) => (
                      <option key={faction.stableId} value={faction.stableId}>
                        {faction.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {factions === undefined ||
              (factions.length > 0 && cards === undefined) ? (
                <div className="deck-state" role="status">
                  Chargement des cartes…
                </div>
              ) : !availableCards?.length ? (
                <div className="deck-state">
                  Aucune carte disponible pour cette faction.
                </div>
              ) : (
                <div className="deck-card-grid">
                  {availableCards.map((card) => (
                    <UnitCard
                      key={card.stableId}
                      card={card}
                      footer={
                        <QuantityControl
                          name={card.name}
                          quantity={quantities.get(card.stableId) ?? 0}
                          busy={busyCards.has(card.stableId)}
                          canAdd={!hasMixedFactions}
                          onAdjust={(delta) =>
                            void changeQuantity(card.stableId, { delta })
                          }
                          onSet={(quantity) =>
                            void changeQuantity(card.stableId, { quantity })
                          }
                        />
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : deck.cards.length === 0 ? (
            <div className="deck-state deck-state--empty">
              <span className="deck-state__mark" aria-hidden="true">
                ✦
              </span>
              <h2>Une page encore blanche.</h2>
              <p>Ce deck ne contient aucune carte.</p>
              <Link
                className="ui-button ui-button--primary"
                to={`/decks/${deck.id}/edit`}
              >
                Ajouter des cartes
              </Link>
            </div>
          ) : (
            <>
              <div className="deck-catalogue-heading">
                <h2>Composition du deck</h2>
                <span>{deck.cards.length} cartes différentes</span>
              </div>
              <div className="deck-card-grid">
                {deck.cards.map((card) => (
                  <UnitCard
                    key={card.stableId}
                    card={card}
                    footer={
                      <span className="deck-copy-count">
                        ×{card.quantity}{" "}
                        <span>exemplaire{card.quantity > 1 ? "s" : ""}</span>
                      </span>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </section>
        <DeckSummary
          deck={deck}
          busyCards={busyCards}
          onRemoveCard={
            editing
              ? (id) => void changeQuantity(id, { quantity: 0 })
              : undefined
          }
        />
      </div>
      {deleting && (
        <DeleteDeckDialog
          deck={deck}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function DeleteDeckDialog({
  deck,
  onClose,
  onDeleted,
}: {
  deck: Deck;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const removeDeck = useMutation(api.decks.remove);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await removeDeck({ deckId: deck.id });
      onDeleted();
    } catch {
      setError("Impossible de supprimer le deck. Réessayez.");
      setBusy(false);
    }
  }

  return (
    <dialog
      className="deck-dialog"
      ref={dialogRef}
      aria-labelledby="delete-deck-title"
      aria-describedby="delete-deck-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <p className="eyebrow">Suppression du deck</p>
      <h2 id="delete-deck-title">Supprimer « {deck.name} » ?</h2>
      <p id="delete-deck-description">
        Le deck et sa composition seront supprimés définitivement.
      </p>
      {error && (
        <p className="deck-error" role="alert">
          {error}
        </p>
      )}
      <div className="deck-actions">
        <button
          className="ui-button"
          autoFocus
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Annuler
        </button>
        <button
          className="ui-button ui-button--danger"
          type="button"
          disabled={busy}
          onClick={() => void remove()}
        >
          {busy ? "Suppression…" : "Supprimer le deck"}
        </button>
      </div>
    </dialog>
  );
}
