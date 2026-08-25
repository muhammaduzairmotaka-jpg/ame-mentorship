-- ============================================================================
-- Makes the new-user trigger role-aware so signup can create mentor/admin
-- accounts directly (previously every signup was hardcoded to 'mentee').
-- Run this once in the Supabase SQL editor.
-- ============================================================================

create or replace function handle_new_user() returns trigger as $$
declare
  chosen_role text;
begin
  chosen_role := coalesce(new.raw_user_meta_data->>'role', 'mentee');
  if chosen_role not in ('mentee', 'mentor', 'admin') then
    chosen_role := 'mentee';
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    chosen_role::user_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );

  if chosen_role = 'mentee' then
    insert into public.mentee_details (profile_id)
    values (new.id);
  elsif chosen_role = 'mentor' then
    insert into public.mentor_details (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition is unchanged, but re-create it defensively in case
-- this migration is run standalone.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
