"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRepository } from "../repository/RepositoryProvider";
import { useAsyncList } from "./useAsyncList";
import {
  CreateCustomerInput,
  CreateGstRegistrationInput,
  CustomerDuplicateQuery,
  UpdateCustomerInput,
  UpdateGstRegistrationInput,
} from "../repository/interfaces";
import { CustomerConflictError } from "../repository/shared/customerLifecycle";
import { CustomerDuplicateCheck } from "../types/domain";

/** The customer list. Search and filtering happen on the already-fetched list (the backend has no query parameters for them). */
export function useCustomers() {
  const repo = useRepository();

  const { data, loading, error, refetch } = useAsyncList(() => repo.customers.list(), [repo]);

  const createCustomer = useCallback(
    async (input: CreateCustomerInput) => {
      const customer = await repo.customers.create(input);
      refetch();
      return customer;
    },
    [repo, refetch]
  );

  return {
    customers: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    createCustomer,
    refetch,
  };
}

const notLoaded = () => new Error("This customer isn't loaded any more. Reload and try again.");

/**
 * One customer: its record, its whole quote-to-cash chain (the overview), its
 * history, and every action on it. The backend is authoritative after each
 * action, so everything is reloaded from it; nothing is changed optimistically.
 * A refusal because the record moved on (a 409) reloads too, so the screen shows
 * the truth, and the backend's message is thrown for the dialog. A 403 reloads
 * nothing: it changed nothing.
 *
 * The overview and the history are part of viewing a customer; if either cannot
 * be read the screen says so rather than showing an empty chain.
 */
export function useCustomerDetail(id: string | undefined) {
  const repo = useRepository();

  const customer = useAsyncList(() => (id ? repo.customers.getById(id) : Promise.resolve(null)), [repo, id]);
  const overview = useAsyncList(() => (id ? repo.customers.getOverview(id) : Promise.resolve(null)), [repo, id]);
  const events = useAsyncList(() => (id ? repo.customers.listEvents(id) : Promise.resolve([])), [repo, id]);

  const refetchCustomer = customer.refetch;
  const refetchOverview = overview.refetch;
  const refetchEvents = events.refetch;
  const refreshAll = useCallback(() => {
    refetchCustomer();
    refetchOverview();
    refetchEvents();
  }, [refetchCustomer, refetchOverview, refetchEvents]);

  const run = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      try {
        const result = await action();
        refreshAll();
        return result;
      } catch (err) {
        if (err instanceof CustomerConflictError) refreshAll();
        throw err;
      }
    },
    [refreshAll]
  );

  const editCustomer = useCallback((input: UpdateCustomerInput) => run(() => (id ? repo.customers.update(id, input) : Promise.reject(notLoaded()))), [id, repo, run]);
  const deactivateCustomer = useCallback((reason: string) => run(() => (id ? repo.customers.deactivate(id, reason) : Promise.reject(notLoaded()))), [id, repo, run]);
  const reactivateCustomer = useCallback((remarks?: string) => run(() => (id ? repo.customers.reactivate(id, remarks) : Promise.reject(notLoaded()))), [id, repo, run]);

  const addRegistration = useCallback(
    (input: Omit<CreateGstRegistrationInput, "customerId">) => run(() => (id ? repo.customerGst.create({ ...input, customerId: id }) : Promise.reject(notLoaded()))),
    [id, repo, run]
  );
  const editRegistration = useCallback((registrationId: string, input: UpdateGstRegistrationInput) => run(() => repo.customerGst.update(registrationId, input)), [repo, run]);
  const deactivateRegistration = useCallback((registrationId: string, reason: string) => run(() => repo.customerGst.deactivate(registrationId, reason)), [repo, run]);
  const reactivateRegistration = useCallback((registrationId: string, remarks?: string) => run(() => repo.customerGst.reactivate(registrationId, remarks)), [repo, run]);
  const makeDefaultRegistration = useCallback((registrationId: string) => run(() => repo.customerGst.setDefault(registrationId)), [repo, run]);

  /** Links an opportunity (typically a "possible legacy match") to this customer. */
  const linkOpportunity = useCallback((opportunityId: string) => run(() => (id ? repo.opportunities.linkCustomer(opportunityId, id) : Promise.reject(notLoaded()))), [id, repo, run]);

  return {
    customer: customer.data,
    loading: customer.loading,
    error: customer.error,
    refetch: customer.refetch,
    overview: overview.data ?? null,
    overviewLoading: overview.loading,
    overviewError: overview.error,
    events: events.data ?? [],
    eventsLoading: events.loading,
    eventsError: events.error,
    refreshAll,
    editCustomer,
    deactivateCustomer,
    reactivateCustomer,
    addRegistration,
    editRegistration,
    deactivateRegistration,
    reactivateRegistration,
    makeDefaultRegistration,
    linkOpportunity,
  };
}

const EMPTY: CustomerDuplicateCheck = { blocking: [], warnings: [] };

/**
 * Looks for customers that resemble the one being typed, a moment after the
 * person stops typing. PAN and name matches are what the backend would refuse
 * (shown as a block), phone and email only warn. Advisory: a failure here is
 * silent, because the backend checks again on save. Nothing is written.
 */
export function useCustomerDuplicateCheck(query: CustomerDuplicateQuery, enabled = true, delayMs = 350) {
  const repo = useRepository();
  const [result, setResult] = useState<CustomerDuplicateCheck>(EMPTY);
  const [checking, setChecking] = useState(false);
  const latest = useRef(0);

  const key = useMemo(() => JSON.stringify([query.customerName, query.panNumber, query.phone, query.email, query.excludeCustomerId]), [query.customerName, query.panNumber, query.phone, query.email, query.excludeCustomerId]);

  useEffect(() => {
    const hasInput = [query.customerName, query.panNumber, query.phone, query.email].some((v) => v && v.trim());
    if (!enabled || !hasInput) {
      setResult(EMPTY);
      setChecking(false);
      return;
    }
    const ticket = ++latest.current;
    setChecking(true);
    const timer = setTimeout(() => {
      repo.customers
        .duplicateCheck(query)
        .then((r) => {
          if (latest.current === ticket) setResult(r);
        })
        .catch(() => {
          if (latest.current === ticket) setResult(EMPTY);
        })
        .finally(() => {
          if (latest.current === ticket) setChecking(false);
        });
    }, delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, key, enabled, delayMs]);

  return { ...result, checking };
}
